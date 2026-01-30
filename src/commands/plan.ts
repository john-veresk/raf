import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { openEditor, getInputTemplate } from '../core/editor.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { getPlanningPrompt } from '../prompts/planning.js';
import {
  validateEnvironment,
  reportValidation,
  validateProjectName,
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export function createPlanCommand(): Command {
  const command = new Command('plan')
    .description('Create a new project and interactively plan tasks with Claude')
    .argument('[projectName]', 'Optional project name (will be prompted if not provided)')
    .action(async (projectName?: string) => {
      await runPlanCommand(projectName);
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
    // Extract first meaningful words from input
    const words = cleanInput
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    finalProjectName = words || 'project';
  }

  if (!validateProjectName(finalProjectName)) {
    logger.error('Invalid project name. Use only letters, numbers, hyphens, and underscores.');
    process.exit(1);
  }

  // Create project
  const projectManager = new ProjectManager();
  const { projectPath, stateManager } = projectManager.createProject(finalProjectName);

  logger.success(`Created project: ${projectPath}`);
  logger.newline();

  // Save input
  projectManager.saveInput(projectPath, userInput);

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner();
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);
  shutdownHandler.registerStateManager(stateManager);

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

    // Sync tasks from created plans
    stateManager.syncTasksFromPlans();
    const tasks = stateManager.getTasks();

    if (tasks.length === 0) {
      logger.warn('No plan files were created.');
      stateManager.setStatus('failed');
    } else {
      stateManager.setStatus('ready');
      logger.newline();
      logger.success(`Planning complete! Created ${tasks.length} task(s).`);
      logger.newline();
      logger.info('Plans created:');
      for (const task of tasks) {
        logger.info(`  - ${task.planFile}`);
      }
      logger.newline();
      logger.info(`Run 'raf do ${finalProjectName}' to execute the plans.`);
    }
  } catch (error) {
    logger.error(`Planning failed: ${error}`);
    stateManager.setStatus('failed');
    throw error;
  } finally {
    // Cleanup empty project folder if no plans were created
    projectManager.cleanupEmptyProject(projectPath);
  }
}
