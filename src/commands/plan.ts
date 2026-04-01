import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { ProjectManager } from '../core/project-manager.js';
import { createRunner } from '../core/runner-factory.js';
import { openEditor, getInputTemplate } from '../core/editor.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { commitPlanningArtifacts } from '../core/git.js';
import { getPlanningPrompt } from '../prompts/planning.js';
import { getAmendPrompt } from '../prompts/amend.js';
import {
  validateEnvironment,
  reportValidation,
  validateProjectName,
  sanitizeProjectName,
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { formatModelDisplay, getModel, getCouncilMode, getWorktreeDefault, getSyncMainBranch } from '../utils/config.js';
import type { ModelEntry } from '../types/config.js';
import { generateProjectNames } from '../utils/name-generator.js';
import { pickProjectName } from '../ui/name-picker.js';
import {
  getPlansDir,
  getRafDir,
  resolveProjectIdentifierWithDetails,
  getInputPath,
  extractTaskNameFromPlanFile,
  decodeTaskId,
  encodeTaskId,
  getNextProjectNumber,
  formatProjectNumber,
  getOutcomesDir,
  getDecisionsPath,
  TASK_ID_PATTERN,
  numericFileSort,
} from '../utils/paths.js';
import {
  deriveProjectState,
  isProjectComplete,
  DerivedTask,
} from '../core/state-derivation.js';
import {
  getRepoBasename,
  getRepoRoot,
  validateWorktree,
  resolveWorktreeProjectByIdentifier,
  createWorktree,
  createWorktreeFromBranch,
  removeWorktree,
  pullMainBranch,
  branchExists,
} from '../core/worktree.js';

interface PlanCommandOptions {
  amend?: boolean;
  auto?: boolean;
  resume?: string;
}

export function createPlanCommand(): Command {
  const command = new Command('plan')
    .description('Create a new project and interactively plan tasks')
    .argument('[projectName]', 'Optional project name (will be prompted if not provided)')
    .option(
      '-a, --amend',
      'Add tasks to an existing project (requires project identifier as argument)'
    )
    .option('-y, --auto', 'Skip permission prompts for file operations')
    .option('-r, --resume <identifier>', 'Resume a planning session for an existing project')
    .action(async (projectName: string | undefined, options: PlanCommandOptions) => {
      const modelEntry = getModel('plan');

      const autoMode = options.auto ?? false;

      if (options.resume) {
        await runResumeCommand(options.resume, modelEntry);
      } else if (options.amend) {
        if (!projectName) {
          logger.error('--amend requires a project identifier');
          logger.error('Usage: raf plan <project> --amend');
          logger.error('   or: raf plan --amend <project>');
          process.exit(1);
        }
        await runAmendCommand(projectName, modelEntry, autoMode);
      } else {
        await runPlanCommand(projectName, modelEntry, autoMode);
      }
    });

  return command;
}

async function runPlanCommand(projectName?: string, modelEntry?: ModelEntry, autoMode: boolean = false): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  // Check if project name matches an existing project
  // This runs even in auto mode — silently duplicating a project is worse than interrupting
  if (projectName) {
    const rafDir = getRafDir();
    const mainResult = resolveProjectIdentifierWithDetails(rafDir, projectName);

    let existingFolder: string | null = null;

    if (mainResult.path) {
      existingFolder = path.basename(mainResult.path);
    } else {
      const repoBasename = getRepoBasename();
      if (repoBasename) {
        const wtResult = resolveWorktreeProjectByIdentifier(repoBasename, projectName);
        if (wtResult) {
          existingFolder = wtResult.folder;
        }
      }
    }

    if (existingFolder) {
      const numMatch = existingFolder.match(/^(\d+)-/);
      const projectId = numMatch ? numMatch[1] : existingFolder;

      const answer = await select({
        message: `Project '${projectName}' already exists (ID: ${projectId}). Did you want to amend it?`,
        choices: [
          { name: 'Yes, amend it', value: 'amend' },
          { name: 'No, create a new project', value: 'create' },
          { name: 'Cancel', value: 'cancel' },
        ],
      });

      if (answer === 'amend') {
        await runAmendCommand(existingFolder, modelEntry, autoMode);
        return;
      } else if (answer === 'cancel') {
        logger.info('Aborted.');
        process.exit(0);
      }
      // 'create': fall through to normal project creation
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
    const nameEntry = getModel('nameGeneration');
    const nameModel = formatModelDisplay(nameEntry.model);
    logger.info(`Generating project name suggestions with ${nameModel}...`);
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

  // Create project — worktree-aware
  let projectPath: string;
  let worktreeRoot: string | null = null;

  const worktreeEnabled = getWorktreeDefault();
  const repoBasename = getRepoBasename();

  if (worktreeEnabled && repoBasename) {
    // Sync main branch first
    if (getSyncMainBranch()) {
      logger.info('Syncing main branch...');
      const syncResult = pullMainBranch();
      if (!syncResult.success) {
        logger.warn(`Could not sync main branch: ${syncResult.error}`);
      }
    }

    // Compute project folder name
    const sanitizedName = sanitizeProjectName(finalProjectName);
    const rafDir = getRafDir();
    const projectNumber = getNextProjectNumber(rafDir, repoBasename);
    const folderName = `${formatProjectNumber(projectNumber)}-${sanitizedName}`;

    // Create worktree
    const wtResult = createWorktree(repoBasename, folderName);

    if (wtResult.success) {
      worktreeRoot = wtResult.worktreePath;

      // Create project structure inside worktree
      const repoRoot = getRepoRoot()!;
      const rafRelativePath = path.relative(repoRoot, rafDir);
      projectPath = path.join(worktreeRoot, rafRelativePath, folderName);

      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(getPlansDir(projectPath), { recursive: true });
      fs.mkdirSync(getOutcomesDir(projectPath), { recursive: true });
      fs.writeFileSync(getDecisionsPath(projectPath), '# Project Decisions\n');

      logger.success(`Created project in worktree: ${projectPath}`);
      logger.info(`Worktree branch: ${wtResult.branch}`);
    } else {
      // Fallback to main repo
      logger.warn(`Worktree creation failed: ${wtResult.error}`);
      logger.warn('Falling back to main repo.');
      const projectManager = new ProjectManager();
      projectPath = projectManager.createProject(finalProjectName);
      logger.success(`Created project: ${projectPath}`);
    }
  } else {
    // Standard mode: create project in main repo
    const projectManager = new ProjectManager();
    projectPath = projectManager.createProject(finalProjectName);
    logger.success(`Created project: ${projectPath}`);
  }

  logger.newline();

  // Save input
  const projectManager = new ProjectManager();
  projectManager.saveInput(projectPath, userInput);

  // Set up shutdown handler
  const claudeRunner = createRunner({ model: modelEntry?.model, harness: modelEntry?.harness, reasoningEffort: modelEntry?.reasoningEffort, fast: modelEntry?.fast });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Register cleanup callback
  shutdownHandler.onShutdown(() => {
    if (worktreeRoot) {
      const plansDir = getPlansDir(projectPath);
      const hasPlans = fs.existsSync(plansDir) &&
        fs.readdirSync(plansDir).filter(f => f.endsWith('.md')).length > 0;
      if (!hasPlans) {
        const rmResult = removeWorktree(worktreeRoot);
        if (!rmResult.success) {
          logger.warn(`Could not remove empty worktree: ${rmResult.error}`);
        }
      }
    } else {
      const projectManager = new ProjectManager();
      projectManager.cleanupEmptyProject(projectPath);
    }
  });

  // Run planning session
  logger.info('Starting planning session...');
  logger.info('The planner will interview you about each task.');
  if (modelEntry) {
    logger.info(`Using model: ${formatModelDisplay(modelEntry.model, modelEntry.harness, { includeHarness: true })}`);
  }
  if (autoMode) {
    logger.warn('Auto mode enabled: permission prompts will be skipped.');
  }
  logger.newline();

  const { systemPrompt, userMessage } = getPlanningPrompt({
    projectPath,
    inputContent: userInput,
    worktreeMode: !!worktreeRoot,
    councilMode: getCouncilMode(),
  });

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: autoMode,
      cwd: worktreeRoot ?? undefined,
    });

    if (exitCode !== 0) {
      logger.warn(`Process exited with code ${exitCode}`);
    }

    // Check for created plan files
    const plansDir = getPlansDir(projectPath);
    const planFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort(numericFileSort)
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

      // Commit planning artifacts (input.md, decisions.md, and plan files)
      const planAbsolutePaths = planFiles.map((f) => path.join(plansDir, f));
      await commitPlanningArtifacts(projectPath, {
        cwd: worktreeRoot ?? undefined,
        additionalFiles: planAbsolutePaths,
      });

      logger.newline();
      logger.info(`Run 'raf do ${finalProjectName}' to execute the plans.`);
    }
  } catch (error) {
    logger.error(`Planning failed: ${error}`);
    throw error;
  } finally {
    if (worktreeRoot) {
      const plansDir = getPlansDir(projectPath);
      const hasPlans = fs.existsSync(plansDir) &&
        fs.readdirSync(plansDir).filter(f => f.endsWith('.md')).length > 0;
      if (!hasPlans) {
        logger.debug('No plans created, removing worktree...');
        const rmResult = removeWorktree(worktreeRoot);
        if (!rmResult.success) {
          logger.warn(`Could not remove empty worktree: ${rmResult.error}`);
        }
      }
    } else {
      const projectManager = new ProjectManager();
      projectManager.cleanupEmptyProject(projectPath);
    }
  }
}

async function runAmendCommand(identifier: string, modelEntry?: ModelEntry, autoMode: boolean = false): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  // Auto-detect project location: check worktrees first, then main repo
  let worktreePath: string | null = null;
  let projectPath: string | undefined;

  const repoBasename = getRepoBasename();
  const rafDir = getRafDir();

  // 1. Try worktree resolution first (if we're in a git repo)
  if (repoBasename) {
    const wtResult = resolveWorktreeProjectByIdentifier(repoBasename, identifier);
    if (wtResult) {
      const repoRoot = getRepoRoot()!;
      const rafRelativePath = path.relative(repoRoot, rafDir);
      worktreePath = wtResult.worktreeRoot;
      projectPath = path.join(wtResult.worktreeRoot, rafRelativePath, wtResult.folder);
    }
  }

  // 2. Fall back to main repo
  if (!projectPath) {
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

  // 3. If project is in main repo but worktree mode is enabled, create a worktree
  if (!worktreePath && repoBasename) {
    const worktreeEnabled = getWorktreeDefault();
    if (worktreeEnabled) {
      const folderName = path.basename(projectPath);

      if (getSyncMainBranch()) {
        logger.info('Syncing main branch...');
        const syncResult = pullMainBranch();
        if (!syncResult.success) {
          logger.warn(`Could not sync main branch: ${syncResult.error}`);
        }
      }

      const wtResult = branchExists(folderName)
        ? createWorktreeFromBranch(repoBasename, folderName)
        : createWorktree(repoBasename, folderName);

      if (wtResult.success) {
        worktreePath = wtResult.worktreePath;
        const repoRoot = getRepoRoot()!;
        const rafRelativePath = path.relative(repoRoot, rafDir);
        projectPath = path.join(worktreePath, rafRelativePath, folderName);
        logger.info(`Created worktree for amendment: ${worktreePath}`);
        logger.info(`Worktree branch: ${wtResult.branch}`);
      } else {
        logger.warn(`Worktree creation failed: ${wtResult.error}`);
        logger.warn('Continuing amendment in main repo.');
      }
    }
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

  // Calculate next task number (numeric task IDs)
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
  if (worktreePath) {
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
  const claudeRunner = createRunner({ model: modelEntry?.model, harness: modelEntry?.harness, reasoningEffort: modelEntry?.reasoningEffort, fast: modelEntry?.fast });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Run amend planning session
  logger.info('Starting amendment session...');
  logger.info('The planner will interview you about each new task.');
  if (modelEntry) {
    logger.info(`Using model: ${formatModelDisplay(modelEntry.model, modelEntry.harness, { includeHarness: true })}`);
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
    councilMode: getCouncilMode(),
  });

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: autoMode,
      // Run session in the worktree root if in worktree mode
      cwd: worktreePath ?? undefined,
    });

    if (exitCode !== 0) {
      logger.warn(`Process exited with code ${exitCode}`);
    }

    // Check for new plan files
    const allPlanFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort(numericFileSort)
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
    }

    // Commit planning artifacts (input.md, decisions.md, and all plan files)
    // Always attempt commit — even without new plans, existing files may have been updated
    const allPlanAbsolutePaths = allPlanFiles.map((f) => path.join(plansDir, f));
    await commitPlanningArtifacts(projectPath, {
      cwd: worktreePath ?? undefined,
      isAmend: true,
      additionalFiles: allPlanAbsolutePaths,
    });

    if (newPlanFiles.length > 0) {
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
# New tasks will be numbered starting from ${encodeTaskId(nextTaskNumber)}
#
# Describe what you want to add below:
`;
}

async function runResumeCommand(identifier: string, modelEntry?: ModelEntry): Promise<void> {
  // Validate environment
  const validation = validateEnvironment();
  reportValidation(validation);

  if (!validation.valid) {
    process.exit(1);
  }

  // Try to resolve the project from worktrees first, then fall back to main repo
  const repoBasename = getRepoBasename();
  const rafDir = getRafDir();

  let projectPath: string | undefined;
  let resumeCwd: string | undefined;
  let folderName: string | undefined;

  // 1. Try worktree resolution first (if we're in a git repo)
  if (repoBasename) {
    const worktreeResolution = resolveWorktreeProjectByIdentifier(repoBasename, identifier);

    if (worktreeResolution) {
      // Found in worktree - validate and use it
      const wtValidation = validateWorktree(worktreeResolution.worktreeRoot, '');

      if (wtValidation.isValidWorktree) {
        folderName = worktreeResolution.folder;
        const repoRoot = getRepoRoot()!;
        const rafRelativePath = path.relative(repoRoot, rafDir);
        projectPath = path.join(worktreeResolution.worktreeRoot, rafRelativePath, folderName);
        resumeCwd = worktreeResolution.worktreeRoot;
        logger.info(`Resuming session in worktree: ${resumeCwd}`);
      } else {
        logger.warn(`Worktree found but invalid: ${worktreeResolution.worktreeRoot}`);
        logger.warn('Falling back to main repo resolution.');
        // Fall through to main repo resolution
      }
    }
  }

  // 2. If not found in worktree (or invalid), try main repo
  if (!projectPath) {
    const mainResolution = resolveProjectIdentifierWithDetails(rafDir, identifier);

    if (!mainResolution.path) {
      if (mainResolution.error === 'ambiguous' && mainResolution.matches) {
        logger.error(`Ambiguous project name: ${identifier}`);
        logger.error('Multiple projects match:');
        for (const match of mainResolution.matches) {
          logger.error(`  - ${match.folder}`);
        }
        logger.error('Please specify the project ID or full folder name.');
      } else {
        logger.error(`Project not found: ${identifier}`);
      }
      process.exit(1);
    }

    projectPath = mainResolution.path;
    folderName = path.basename(projectPath);
    resumeCwd = projectPath; // Use main repo project path as CWD
  }

  logger.info(`Project: ${folderName}`);
  if (modelEntry) {
    logger.info(`Model: ${formatModelDisplay(modelEntry.model, modelEntry.harness, { includeHarness: true })}`);
  }
  logger.newline();

  // Set up shutdown handler
  const claudeRunner = createRunner({ model: modelEntry?.model, harness: modelEntry?.harness, reasoningEffort: modelEntry?.reasoningEffort, fast: modelEntry?.fast });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  // Launch session resume picker
  logger.info('Starting session resume picker...');
  logger.newline();

  try {
    const exitCode = await claudeRunner.runResume({ cwd: resumeCwd });

    if (exitCode !== 0) {
      logger.warn(`Process exited with code ${exitCode}`);
    }

    // Check for created/updated plan files after resume session
    const plansDir = getPlansDir(projectPath);
    const planFiles = fs.existsSync(plansDir)
      ? fs.readdirSync(plansDir).filter((f) => f.endsWith('.md')).sort(numericFileSort)
      : [];

    if (planFiles.length > 0) {
      logger.newline();
      logger.success(`Session complete! Project has ${planFiles.length} plan(s).`);
      logger.newline();
      logger.info('Plans:');
      for (const planFile of planFiles) {
        logger.info(`  - plans/${planFile}`);
      }
    }
  } catch (error) {
    logger.error(`Resume session failed: ${error}`);
    throw error;
  }
}
