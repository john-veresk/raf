import * as fs from 'node:fs';
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
import { generateProjectName } from '../utils/name-generator.js';
import { getPlansDir } from '../utils/paths.js';
import { commitProjectFolder } from '../core/git.js';

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
      const commitResult = commitProjectFolder(projectPath, finalProjectName);
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
