import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { ProjectManager } from '../core/project-manager.js';
import { ClaudeRunner } from '../core/claude-runner.js';
import { openEditor, getInputTemplate } from '../core/editor.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { commitPlanningArtifacts } from '../core/git.js';
import { getPlanningPrompt } from '../prompts/planning.js';
import { getAmendPrompt } from '../prompts/amend.js';
import {
  validateEnvironment,
  reportValidation,
  validateProjectName,
  resolveModelOption,
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { generateProjectNames } from '../utils/name-generator.js';
import { pickProjectName } from '../ui/name-picker.js';
import {
  getPlansDir,
  getRafDir,
  getNextProjectNumber,
  formatProjectNumber,
  resolveProjectIdentifier,
  resolveProjectIdentifierWithDetails,
  getInputPath,
  getDecisionsPath,
  getOutcomesDir,
  extractTaskNameFromPlanFile,
  decodeTaskId,
  encodeTaskId,
  TASK_ID_PATTERN,
} from '../utils/paths.js';
import { sanitizeProjectName } from '../utils/validation.js';
import {
  deriveProjectState,
  isProjectComplete,
  DerivedTask,
} from '../core/state-derivation.js';
import {
  getRepoBasename,
  getRepoRoot,
  createWorktree,
  createWorktreeFromBranch,
  branchExists,
  validateWorktree,
  removeWorktree,
  computeWorktreeBaseDir,
} from '../core/worktree.js';

interface PlanCommandOptions {
  amend?: boolean;
  model?: string;
  sonnet?: boolean;
  auto?: boolean;
  worktree?: boolean;
}

export function createPlanCommand(): Command {
  const command = new Command('plan')
    .description('Create a new project and interactively plan tasks with Claude')
    .argument('[projectName]', 'Optional project name (will be prompted if not provided)')
    .option(
      '-a, --amend',
      'Add tasks to an existing project (requires project identifier as argument)'
    )
    .option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')
    .option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')
    .option('-y, --auto', "Skip Claude's permission prompts for file operations")
    .option('-w, --worktree', 'Create a git worktree for isolated planning')
    .action(async (projectName: string | undefined, options: PlanCommandOptions) => {
      // Validate and resolve model option
      let model: string;
      try {
        model = resolveModelOption(options.model, options.sonnet);
      } catch (error) {
        logger.error((error as Error).message);
        process.exit(1);
      }

      const autoMode = options.auto ?? false;
      const worktreeMode = options.worktree ?? false;

      if (options.amend) {
        if (!projectName) {
          logger.error('--amend requires a project identifier');
          logger.error('Usage: raf plan <project> --amend');
          logger.error('   or: raf plan --amend <project>');
          process.exit(1);
        }
        await runAmendCommand(projectName, model, autoMode, worktreeMode);
      } else {
        await runPlanCommand(projectName, model, autoMode, worktreeMode);
      }
    });

  return command;
}

async function runPlanCommand(projectName?: string, model?: string, autoMode: boolean = false, worktreeMode: boolean = false): Promise<void> {
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

  // Validate git repo for worktree mode
  if (worktreeMode) {
    const repoRoot = getRepoRoot();
    if (!repoRoot) {
      logger.error('--worktree requires a git repository');
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
    logger.info('Generating project name suggestions...');
    const suggestedNames = await generateProjectNames(cleanInput);
    logger.newline();

    if (autoMode) {
      // Auto-select the first generated name
      // generateProjectNames always returns at least one fallback name
      finalProjectName = suggestedNames[0] ?? 'project';
      logger.info(`Auto-selected project name: ${finalProjectName}`);
    } else {
      finalProjectName = await pickProjectName(suggestedNames);
    }
  }

  if (!validateProjectName(finalProjectName)) {
    logger.error('Invalid project name. Use only letters, numbers, hyphens, and underscores.');
    process.exit(1);
  }

  let projectPath: string;
  let worktreePath: string | null = null;
  let worktreeBranch: string | null = null;

  if (worktreeMode) {
    // Worktree mode: create worktree, then project folder inside it
    const repoBasename = getRepoBasename()!;
    const repoRoot = getRepoRoot()!;
    const rafDir = getRafDir();

    // Compute project number from main repo's RAF directory
    const projectNumber = getNextProjectNumber(rafDir);
    const sanitizedName = sanitizeProjectName(finalProjectName);
    const folderName = `${formatProjectNumber(projectNumber)}-${sanitizedName}`;

    // Create worktree
    const result = createWorktree(repoBasename, folderName);
    if (!result.success) {
      logger.error(`Failed to create worktree: ${result.error}`);
      process.exit(1);
    }

    worktreePath = result.worktreePath;
    worktreeBranch = result.branch;

    // Compute project path inside worktree at the same relative path
    const rafRelativePath = path.relative(repoRoot, rafDir);
    projectPath = path.join(worktreePath, rafRelativePath, folderName);

    // Create project folder structure inside the worktree
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(getPlansDir(projectPath), { recursive: true });
    fs.mkdirSync(getOutcomesDir(projectPath), { recursive: true });
    fs.writeFileSync(getDecisionsPath(projectPath), '# Project Decisions\n');

    // Save input inside worktree project folder
    fs.writeFileSync(getInputPath(projectPath), userInput);

    logger.success(`Created worktree: ${worktreePath}`);
    logger.success(`Branch: ${worktreeBranch}`);
    logger.success(`Project: ${projectPath}`);
    logger.newline();
  } else {
    // Standard mode: create project in main repo
    const projectManager = new ProjectManager();
    projectPath = projectManager.createProject(finalProjectName);

    logger.success(`Created project: ${projectPath}`);
    logger.newline();

    // Save input
    projectManager.saveInput(projectPath, userInput);
  }

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner({ model });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Register cleanup callback
  shutdownHandler.onShutdown(() => {
    if (worktreeMode && worktreePath) {
      // Clean up worktree if no plans were created
      const plansDir = getPlansDir(projectPath);
      const hasPlanFiles = fs.existsSync(plansDir) &&
        fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).length > 0;
      if (!hasPlanFiles) {
        const removal = removeWorktree(worktreePath);
        if (removal.success) {
          logger.debug(`Cleaned up worktree: ${worktreePath}`);
        } else {
          logger.warn(`Failed to clean up worktree: ${removal.error}`);
        }
      }
    } else {
      const projectManager = new ProjectManager();
      projectManager.cleanupEmptyProject(projectPath);
    }
  });

  // Run planning session
  logger.info('Starting planning session with Claude...');
  logger.info('Claude will interview you about each task.');
  if (model) {
    logger.info(`Using model: ${model}`);
  }
  if (autoMode) {
    logger.warn('Auto mode enabled: permission prompts will be skipped.');
  }
  logger.newline();

  const { systemPrompt, userMessage } = getPlanningPrompt({
    projectPath,
    inputContent: userInput,
    worktreeMode,
  });

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: autoMode,
      // Run Claude session in the worktree root if in worktree mode
      cwd: worktreePath ?? undefined,
    });

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

      // Commit planning artifacts (input.md and decisions.md)
      await commitPlanningArtifacts(projectPath, worktreePath ? { cwd: worktreePath } : undefined);

      logger.newline();
      if (worktreeMode) {
        logger.info(`Worktree: ${worktreePath}`);
        logger.info(`Branch: ${worktreeBranch}`);
        logger.info(`Run 'raf do ${finalProjectName} --worktree' to execute the plans.`);
      } else {
        logger.info(`Run 'raf do ${finalProjectName}' to execute the plans.`);
      }
    }
  } catch (error) {
    logger.error(`Planning failed: ${error}`);
    throw error;
  } finally {
    if (worktreeMode && worktreePath) {
      // Clean up worktree if no plans were created
      const plansDir = getPlansDir(projectPath);
      const hasPlanFiles = fs.existsSync(plansDir) &&
        fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).length > 0;
      if (!hasPlanFiles) {
        const removal = removeWorktree(worktreePath);
        if (removal.success) {
          logger.debug(`Cleaned up worktree: ${worktreePath}`);
        } else {
          logger.warn(`Failed to clean up worktree: ${removal.error}`);
        }
      }
    } else if (!worktreeMode) {
      // Cleanup empty project folder if no plans were created (standard mode only)
      const projectManager = new ProjectManager();
      projectManager.cleanupEmptyProject(projectPath);
    }
  }
}

async function runAmendCommand(identifier: string, model?: string, autoMode: boolean = false, worktreeMode: boolean = false): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  let worktreePath: string | null = null;
  let projectPath: string;

  if (worktreeMode) {
    // Worktree mode: resolve project from worktree directory
    const repoBasename = getRepoBasename();
    if (!repoBasename) {
      logger.error('--worktree requires a git repository');
      process.exit(1);
    }

    const repoRoot = getRepoRoot()!;
    const rafDir = getRafDir();
    const rafRelativePath = path.relative(repoRoot, rafDir);

    const worktreeBaseDir = computeWorktreeBaseDir(repoBasename);

    // Search through existing worktree directories for the project
    let matchedWorktreeDir: string | null = null;
    let matchedProjectPath: string | null = null;

    if (fs.existsSync(worktreeBaseDir)) {
      const entries = fs.readdirSync(worktreeBaseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const wtPath = path.join(worktreeBaseDir, entry.name);
        const wtRafDir = path.join(wtPath, rafRelativePath);
        if (!fs.existsSync(wtRafDir)) continue;

        const resolution = resolveProjectIdentifierWithDetails(wtRafDir, identifier);
        if (resolution.path) {
          if (matchedWorktreeDir) {
            logger.error(`Ambiguous: project "${identifier}" found in multiple worktrees`);
            process.exit(1);
          }
          matchedWorktreeDir = wtPath;
          matchedProjectPath = resolution.path;
        }
      }
    }

    if (!matchedWorktreeDir || !matchedProjectPath) {
      // Worktree not found — try to recreate it
      // First, resolve the project from the main repo to get the folder name
      const mainResolution = resolveProjectIdentifierWithDetails(rafDir, identifier);
      if (!mainResolution.path) {
        logger.error(`Project not found in any worktree or main repo: ${identifier}`);
        logger.error(`Searched in: ${worktreeBaseDir}`);
        process.exit(1);
      }

      const folderName = path.basename(mainResolution.path);

      if (branchExists(folderName)) {
        // Branch exists — recreate worktree from it
        const result = createWorktreeFromBranch(repoBasename, folderName);
        if (!result.success) {
          logger.error(`Failed to recreate worktree from branch: ${result.error}`);
          process.exit(1);
        }
        matchedWorktreeDir = result.worktreePath;
        matchedProjectPath = path.join(result.worktreePath, rafRelativePath, folderName);
        logger.info(`Recreated worktree from branch: ${folderName}`);
      } else {
        // No branch — create fresh worktree and copy project files
        const result = createWorktree(repoBasename, folderName);
        if (!result.success) {
          logger.error(`Failed to create worktree: ${result.error}`);
          process.exit(1);
        }
        matchedWorktreeDir = result.worktreePath;
        const wtProjectPath = path.join(result.worktreePath, rafRelativePath, folderName);
        // Copy project folder from main repo into the new worktree
        fs.cpSync(mainResolution.path, wtProjectPath, { recursive: true });
        matchedProjectPath = wtProjectPath;
        logger.info(`Created fresh worktree and copied project files: ${folderName}`);
      }
    }

    worktreePath = matchedWorktreeDir;
    projectPath = matchedProjectPath;

    // Validate the worktree is valid
    const relProjectPath = path.relative(worktreePath, projectPath);
    const wtValidation = validateWorktree(worktreePath, relProjectPath);
    if (!wtValidation.isValidWorktree) {
      logger.error(`Invalid worktree at: ${worktreePath}`);
      logger.error('The worktree may have been removed or corrupted.');
      process.exit(1);
    }
  } else {
    // Standard mode: resolve from main repo
    const rafDir = getRafDir();
    const resolution = resolveProjectIdentifierWithDetails(rafDir, identifier);

    if (!resolution.path) {
      if (resolution.error === 'ambiguous' && resolution.matches) {
        logger.error(`Ambiguous project name: ${identifier}`);
        logger.error('Multiple projects match:');
        for (const match of resolution.matches) {
          logger.error(`  - ${match.folder}`);
        }
        logger.error('Please specify the project ID or full folder name.');
      } else {
        logger.error(`Project not found: ${identifier}`);
      }
      process.exit(1);
    }

    projectPath = resolution.path;
  }

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

  // Calculate next task number (decode base36 task IDs)
  const maxTaskNumber = Math.max(
    ...projectState.tasks.map((t) => decodeTaskId(t.id) ?? 0)
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
  if (worktreeMode && worktreePath) {
    logger.info(`  Worktree: ${worktreePath}`);
  }
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

  // Append new task description to input.md with separator
  const separator = '\n\n---\n\n';
  const updatedInput = originalInput.trim()
    ? `${originalInput.trimEnd()}${separator}${cleanInput}`
    : cleanInput;
  fs.writeFileSync(inputPath, updatedInput);

  // Set up shutdown handler
  const claudeRunner = new ClaudeRunner({ model });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Run amend planning session
  logger.info('Starting amendment session with Claude...');
  logger.info('Claude will interview you about each new task.');
  if (model) {
    logger.info(`Using model: ${model}`);
  }
  if (autoMode) {
    logger.warn('Auto mode enabled: permission prompts will be skipped.');
  }
  logger.newline();

  const { systemPrompt, userMessage } = getAmendPrompt({
    projectPath,
    existingTasks,
    nextTaskNumber,
    newTaskDescription: cleanInput,
    worktreeMode,
  });

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: autoMode,
      // Run Claude session in the worktree root if in worktree mode
      cwd: worktreePath ?? undefined,
    });

    if (exitCode !== 0) {
      logger.warn(`Claude exited with code ${exitCode}`);
    }

    // Check for new plan files
    const allPlanFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort()
      : [];

    const newPlanFiles = allPlanFiles.filter((f) => {
      const match = f.match(new RegExp(`^(${TASK_ID_PATTERN})-`));
      if (match && match[1]) {
        return (decodeTaskId(match[1]) ?? 0) >= nextTaskNumber;
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

      // Commit planning artifacts (input.md, decisions.md, and new plan files)
      const newPlanPaths = newPlanFiles.map(f => path.join(plansDir, f));
      await commitPlanningArtifacts(projectPath, {
        cwd: worktreePath ?? undefined,
        additionalFiles: newPlanPaths,
        isAmend: true,
      });

      logger.newline();
      logger.info(`Total tasks: ${allPlanFiles.length}`);
      if (worktreeMode) {
        logger.info(`Run 'raf do ${identifier} --worktree' to execute the new tasks.`);
      } else {
        logger.info(`Run 'raf do ${identifier}' to execute the new tasks.`);
      }
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
# New tasks will be numbered starting from ${encodeTaskId(nextTaskNumber)}
#
# Describe what you want to add below:
`;
}
