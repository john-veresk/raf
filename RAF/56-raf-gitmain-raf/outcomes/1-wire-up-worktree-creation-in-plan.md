# Outcome: Wire Up Worktree Creation in `raf plan`

## Summary
Re-wired worktree creation into `runPlanCommand()` so that `raf plan` creates a git worktree when `config.worktree: true`.

## Key Changes

### `src/commands/plan.ts`
- Added imports: `getWorktreeDefault`, `getSyncMainBranch`, `createWorktree`, `removeWorktree`, `pullMainBranch`, `sanitizeProjectName`, `getNextProjectNumber`, `formatProjectNumber`, `getOutcomesDir`, `getDecisionsPath`
- Replaced simple `ProjectManager.createProject()` call with worktree-aware branching logic:
  - When `worktreeEnabled && repoBasename`: syncs main branch, computes folder name, creates worktree, creates project structure inside worktree
  - Falls back to main repo on worktree creation failure
  - Keeps existing behavior when worktree is disabled
- Updated shutdown handler to remove empty worktrees instead of cleaning up main repo folders
- Updated `getPlanningPrompt` call to pass `worktreeMode: !!worktreeRoot`
- Updated `runInteractive` call to pass `cwd: worktreeRoot`
- Updated `commitPlanningArtifacts` call to pass `cwd: worktreeRoot`
- Updated `finally` block to handle worktree cleanup

### `src/core/project-manager.ts`
- Added `getRepoBasename` import from worktree module
- Updated `createProject()` to pass `repoBasename` to `getNextProjectNumber()` to avoid number collisions between main repo and worktree projects

## Acceptance Criteria Met
- [x] `raf plan` with `worktree: true` creates a git worktree and project inside it
- [x] Claude planning session runs with `cwd` set to the worktree root
- [x] Planning artifacts committed inside the worktree branch via `cwd` option
- [x] Worktree creation failure falls back to main repo with warning
- [x] Empty worktree cleaned up on exit (shutdown handler + finally block)
- [x] `raf plan` with `worktree: false` works unchanged (standard ProjectManager path)
- [x] Project numbering includes worktree projects via `repoBasename` parameter
- [x] Main branch synced before worktree creation when `syncMainBranch` is true
- [x] TypeScript compiles cleanly with no errors

<promise>COMPLETE</promise>
