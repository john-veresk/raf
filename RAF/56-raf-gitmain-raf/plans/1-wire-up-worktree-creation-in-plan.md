---
effort: medium
---
# Task: Wire Up Worktree Creation in `raf plan`

## Objective
When `config.worktree: true`, `raf plan` should create a git worktree and place the project inside it instead of the main repo's RAF dir.

## Context
The `worktree` config flag exists (`src/types/config.ts`), `getWorktreeDefault()` exists (`src/utils/config.ts:595`), and `createWorktree()` exists (`src/core/worktree.ts:106`), but nothing in `raf plan` connects them. Project 46 (lantern-arc) stripped the worktree creation logic from `plan.ts` as a "cleanup," breaking the feature. The infrastructure is all there — this task re-wires it.

**Key reference:** `src/commands/plan.ts:runPlanCommand()` (lines 84-266) is the only function that needs changes. The amend and resume commands already handle worktrees correctly.

## Requirements
- When `getWorktreeDefault()` returns `true` AND the user is in a git repo:
  1. Sync main branch before worktree creation (via `pullMainBranch()`)
  2. Create a worktree via `createWorktree(repoBasename, folderName)` where `folderName` is the project folder name (e.g., `57-my-project`)
  3. Create the project structure (plans/, outcomes/, decisions.md) inside the worktree at the correct relative path
  4. Run the Claude planning session with `cwd: worktreeRoot`
  5. Commit planning artifacts with `cwd: worktreeRoot`
- When `getWorktreeDefault()` returns `false` OR not in a git repo: keep existing behavior (project in main repo)
- If worktree creation fails: log a warning and fall back to main repo project creation
- On shutdown/cleanup: if the worktree project is empty, remove the worktree via `removeWorktree()`
- No `--worktree` or `--no-worktree` CLI flags — purely config-driven
- Project folder lives ONLY in the worktree, not in the main repo

## Implementation Steps

1. **Add missing imports to `plan.ts`:**
   ```typescript
   import { getWorktreeDefault, getSyncMainBranch } from '../utils/config.js';
   import { createWorktree, removeWorktree, pullMainBranch } from '../core/worktree.js';
   import { sanitizeProjectName } from '../utils/validation.js';
   import { getNextProjectNumber, formatProjectNumber, getPlansDir as getPlansDir2, getOutcomesDir, getDecisionsPath, ensureRafDir } from '../utils/paths.js';
   ```
   Note: some of these may already be imported — merge with existing imports.

2. **In `runPlanCommand()`, after `finalProjectName` is determined (after line 183), replace the simple project creation with worktree-aware logic:**

   ```typescript
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
   ```

3. **Update the shutdown handler cleanup (around line 201) to handle worktree removal:**
   ```typescript
   shutdownHandler.onShutdown(() => {
     if (worktreeRoot) {
       // Check if worktree project is empty, remove worktree if so
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
   ```

4. **Update the `runInteractive` call (around line 224) to pass `cwd`:**
   ```typescript
   const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
     dangerouslySkipPermissions: autoMode,
     cwd: worktreeRoot ?? undefined,
   });
   ```

5. **Update `getPlanningPrompt` call (around line 217) to pass `worktreeMode`:**
   ```typescript
   const { systemPrompt, userMessage } = getPlanningPrompt({
     projectPath,
     inputContent: userInput,
     worktreeMode: !!worktreeRoot,
     councilMode: getCouncilMode(),
   });
   ```

6. **Update `commitPlanningArtifacts` call (around line 251) to pass `cwd`:**
   ```typescript
   await commitPlanningArtifacts(projectPath, {
     cwd: worktreeRoot ?? undefined,
     additionalFiles: planAbsolutePaths,
   });
   ```

7. **Update the `finally` block cleanup (around line 262) to handle worktree:**
   ```typescript
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
   ```

8. **Move the `logger.newline()` after project creation** — currently the newline is between `createProject` and `saveInput`. Keep it after the new branching logic.

9. **Pass `repoBasename` to `getNextProjectNumber` in `ProjectManager.createProject`** — this is a minor improvement to avoid number collisions between main repo and worktree projects. In `src/core/project-manager.ts:45`, change:
   ```typescript
   const projectNumber = getNextProjectNumber(this.rafDir);
   ```
   to:
   ```typescript
   const repoBasename = getRepoBasename();
   const projectNumber = getNextProjectNumber(this.rafDir, repoBasename ?? undefined);
   ```
   This requires importing `getRepoBasename` from `../core/worktree.js`.

## Acceptance Criteria
- [ ] `raf plan` with `worktree: true` in config creates a git worktree and project inside it
- [ ] The Claude planning session runs with `cwd` set to the worktree root
- [ ] Planning artifacts are committed inside the worktree branch, not main
- [ ] If worktree creation fails, the project is created in the main repo with a warning
- [ ] If planning produces no plans and user exits, the empty worktree is cleaned up
- [ ] `raf plan` with `worktree: false` (default) works unchanged
- [ ] `raf do <project>` can discover and execute worktree projects created by `raf plan` (already works — verify only)
- [ ] Project numbering doesn't collide between main repo and worktree projects
- [ ] Main branch is synced before worktree creation (when `syncMainBranch` config is true)

## Notes
- The worktree infrastructure is fully built (`src/core/worktree.ts`) — this task only wires it into `runPlanCommand()`.
- Project 46 (lantern-arc, outcome `2-clean-up-worktree-plan-command.md`) removed this wiring. That outcome file documents exactly what was removed — it's a useful reference for what to re-add.
- The `amend` and `resume` subcommands in `plan.ts` already handle worktrees correctly — they auto-detect worktree projects. No changes needed there.
- `do.ts` already auto-detects and executes worktree projects regardless of config — no changes needed.
