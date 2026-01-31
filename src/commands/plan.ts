import * as fs from 'node:fs';
import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { openEditor, getInputTemplate } from '../core/editor.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { getPlanningPrompt } from '../prompts/planning.js';
import { getAmendPrompt } from '../prompts/amend.js';
import {
  validateEnvironment,
  reportValidation,
  validateProjectName,
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { generateProjectName } from '../utils/name-generator.js';
import {
  getPlansDir,
  getRafDir,
  resolveProjectIdentifier,
  resolveProjectIdentifierWithDetails,
  getInputPath,
  extractTaskNameFromPlanFile,
  extractProjectNumber,
} from '../utils/paths.js';
import { commitProjectFolder } from '../core/git.js';
import {
  deriveProjectState,
  isProjectComplete,
  DerivedTask,
} from '../core/state-derivation.js';

interface PlanCommandOptions {
  amend?: string;
}

export function createPlanCommand(): Command {
  const command = new Command('plan')
    .description('Create a new project and interactively plan tasks with Claude')
    .argument('[projectName]', 'Optional project name (will be prompted if not provided)')
    .option(
      '-a, --amend <identifier>',
      'Add tasks to an existing project (number, name, or folder)'
    )
    .action(async (projectName: string | undefined, options: PlanCommandOptions) => {
      if (options.amend) {
        await runAmendCommand(options.amend);
      } else {
        await runPlanCommand(projectName);
      }
    });

  return command;
}

async function runPlanCommand(projectName?: string): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  // Check if project name matches an existing project
  if (projectName) {
    const rafDir = getRafDir();
    const existingProject = resolveProjectIdentifier(rafDir, projectName);
    if (existingProject) {
      logger.error(`Project already exists: ${existingProject}`);
      logger.error(`To add tasks to an existing project, use: raf plan --amend ${projectName}`);
      process.exit(1);
    }
  }

  // Open editor for user input
  logger.info('Opening editor for project description...');
  logger.info('(Save and close the editor when done)');
  logger.newline();

  let userInput: string;
  try {
    userInput = await openEditor(getInputTemplate());
  } catch (error) {
    logger.error(`Failed to get input: ${error}`);
    process.exit(1);
  }

  // Check if input is empty or just the template
  const cleanInput = userInput
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#.*$/gm, '')
    .trim();

  if (!cleanInput) {
    logger.error('No project description provided. Aborting.');
    process.exit(1);
  }

  // Get or generate project name
  let finalProjectName = projectName;
  if (!finalProjectName) {
    logger.info('Generating project name...');
    finalProjectName = await generateProjectName(cleanInput);
  }

  if (!validateProjectName(finalProjectName)) {
    logger.error('Invalid project name. Use only letters, numbers, hyphens, and underscores.');
    process.exit(1);
  }

  // Create project
  const projectManager = new ProjectManager();
  const projectPath = projectManager.createProject(finalProjectName);

  logger.success(`Created project: ${projectPath}`);
  logger.newline();

  // Save input
  projectManager.saveInput(projectPath, userInput);

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Register cleanup callback for empty project folder
  shutdownHandler.onShutdown(() => {
    projectManager.cleanupEmptyProject(projectPath);
  });

  // Run planning session
  logger.info('Starting planning session with Claude...');
  logger.info('Claude will interview you about each task.');
  logger.newline();

  const prompt = getPlanningPrompt({
    projectPath,
    inputContent: userInput,
  });

  try {
    const exitCode = await claudeRunner.runInteractive(prompt);

    if (exitCode !== 0) {
      logger.warn(`Claude exited with code ${exitCode}`);
    }

    // Check for created plan files
    const plansDir = getPlansDir(projectPath);
    const planFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort()
      : [];

    if (planFiles.length === 0) {
      logger.warn('No plan files were created.');
    } else {
      logger.newline();
      logger.success(`Planning complete! Created ${planFiles.length} task(s).`);
      logger.newline();
      logger.info('Plans created:');
      for (const planFile of planFiles) {
        logger.info(`  - plans/${planFile}`);
      }

      // Commit the project folder
      logger.newline();
      const projectNum = extractProjectNumber(projectPath) ?? '000';
      const commitResult = commitProjectFolder(projectPath, projectNum, 'plan');
      if (commitResult.success) {
        if (commitResult.message === 'No changes to commit') {
          logger.info('Project files already committed.');
        } else {
          logger.success(`Committed: ${commitResult.message}`);
        }
      } else {
        logger.warn(`Could not commit project files: ${commitResult.error}`);
        logger.info('Planning succeeded, but you may want to commit manually.');
      }

      logger.newline();
      logger.info(`Run 'raf do ${finalProjectName}' to execute the plans.`);
    }
  } catch (error) {
    logger.error(`Planning failed: ${error}`);
    throw error;
  } finally {
    // Cleanup empty project folder if no plans were created
    projectManager.cleanupEmptyProject(projectPath);
  }
}

async function runAmendCommand(identifier: string): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  // Resolve the project
  const rafDir = getRafDir();
  const result = resolveProjectIdentifierWithDetails(rafDir, identifier);

  if (!result.path) {
    if (result.error === 'ambiguous' && result.matches) {
      logger.error(`Ambiguous project name: ${identifier}`);
      logger.error('Multiple projects match:');
      for (const match of result.matches) {
        logger.error(`  - ${match.folder}`);
      }
      logger.error('Please specify the project ID or full folder name.');
    } else {
      logger.error(`Project not found: ${identifier}`);
    }
    process.exit(1);
  }

  const projectPath = result.path;

  // Load existing project state
  const projectState = deriveProjectState(projectPath);

  if (projectState.tasks.length === 0) {
    logger.error(`Project has no tasks yet. Use 'raf plan' instead.`);
    process.exit(1);
  }

  // Check if project is fully completed and show warning
  if (isProjectComplete(projectState)) {
    logger.warn('Project is fully completed. New tasks will extend the existing plan.');
    logger.newline();
  }

  // Get existing tasks with their names
  const plansDir = getPlansDir(projectPath);
  const existingTasks: Array<DerivedTask & { taskName: string }> = projectState.tasks.map(
    (task) => {
      const planFile = task.planFile.replace('plans/', '');
      const taskName = extractTaskNameFromPlanFile(planFile) ?? 'unknown';
      return { ...task, taskName };
    }
  );

  // Calculate next task number
  const maxTaskNumber = Math.max(
    ...projectState.tasks.map((t) => parseInt(t.id, 10))
  );
  const nextTaskNumber = maxTaskNumber + 1;

  // Load original input
  const inputPath = getInputPath(projectPath);
  const originalInput = fs.existsSync(inputPath)
    ? fs.readFileSync(inputPath, 'utf-8')
    : '';

  // Show existing tasks summary
  logger.info('Amending existing project:');
  logger.info(`  Path: ${projectPath}`);
  logger.info(`  Existing tasks: ${existingTasks.length}`);
  logger.newline();
  logger.info('Current tasks:');
  for (const task of existingTasks) {
    const statusIcon =
      task.status === 'completed' ? '[done]' : task.status === 'failed' ? '[fail]' : '[    ]';
    logger.info(`  ${statusIcon} ${task.id}: ${task.taskName}`);
  }
  logger.newline();

  // Open editor for new task description
  const editorTemplate = getAmendTemplate(existingTasks, nextTaskNumber);
  logger.info('Opening editor for new task description...');
  logger.info('(Save and close the editor when done)');
  logger.newline();

  let userInput: string;
  try {
    userInput = await openEditor(editorTemplate);
  } catch (error) {
    logger.error(`Failed to get input: ${error}`);
    process.exit(1);
  }

  // Extract new task description (remove the template comments)
  const cleanInput = userInput
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#.*$/gm, '')
    .trim();

  if (!cleanInput) {
    logger.error('No new task description provided. Aborting.');
    process.exit(1);
  }

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Run amend planning session
  logger.info('Starting amendment session with Claude...');
  logger.info('Claude will interview you about each new task.');
  logger.newline();

  const prompt = getAmendPrompt({
    projectPath,
    inputContent: originalInput,
    existingTasks,
    nextTaskNumber,
    newTaskDescription: cleanInput,
  });

  try {
    const exitCode = await claudeRunner.runInteractive(prompt);

    if (exitCode !== 0) {
      logger.warn(`Claude exited with code ${exitCode}`);
    }

    // Check for new plan files
    const allPlanFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort()
      : [];

    const newPlanFiles = allPlanFiles.filter((f) => {
      const match = f.match(/^(\d{2,3})-/);
      if (match && match[1]) {
        return parseInt(match[1], 10) >= nextTaskNumber;
      }
      return false;
    });

    if (newPlanFiles.length === 0) {
      logger.warn('No new plan files were created.');
    } else {
      logger.newline();
      logger.success(`Amendment complete! Added ${newPlanFiles.length} new task(s).`);
      logger.newline();
      logger.info('New plans created:');
      for (const planFile of newPlanFiles) {
        logger.info(`  - plans/${planFile}`);
      }

      // Commit the changes
      logger.newline();
      const projectNum = extractProjectNumber(projectPath) ?? '000';
      const commitResult = commitProjectFolder(projectPath, projectNum, 'plan');
      if (commitResult.success) {
        if (commitResult.message === 'No changes to commit') {
          logger.info('Project files already committed.');
        } else {
          logger.success(`Committed: ${commitResult.message}`);
        }
      } else {
        logger.warn(`Could not commit project files: ${commitResult.error}`);
        logger.info('Amendment succeeded, but you may want to commit manually.');
      }

      logger.newline();
      logger.info(`Total tasks: ${allPlanFiles.length}`);
      logger.info(`Run 'raf do ${identifier}' to execute the new tasks.`);
    }
  } catch (error) {
    logger.error(`Amendment failed: ${error}`);
    throw error;
  }
}

/**
 * Generate editor template for amend mode showing existing tasks.
 */
function getAmendTemplate(
  existingTasks: Array<DerivedTask & { taskName: string }>,
  nextTaskNumber: number
): string {
  const taskList = existingTasks
    .map((task) => {
      const status =
        task.status === 'completed'
          ? '[COMPLETED]'
          : task.status === 'failed'
            ? '[FAILED]'
            : '[PENDING]';
      return `#   ${task.id}: ${task.taskName} ${status}`;
    })
    .join('\n');

  return `# Describe the new tasks you want to add
#
# Existing tasks (read-only reference):
${taskList}
#
# New tasks will be numbered starting from ${nextTaskNumber.toString().padStart(3, '0')}
#
# Describe what you want to add below:
`;
}
