# Outcome: Clean up worktree flag from plan command

## Summary
Removed all dead worktree code from `runPlanCommand()` in `src/commands/plan.ts`. The `--worktree` flag was never exposed on the plan command, making `worktreeMode` and related logic unreachable dead code.

## Changes Made
- `src/commands/plan.ts`:
  - Removed `worktree?: boolean` from `PlanCommandOptions` interface
  - Removed `getWorktreeDefault` and `getSyncMainBranch` from config.js imports
  - Removed `createWorktree`, `removeWorktree`, `pullMainBranch` from worktree.js imports
  - Removed `getNextProjectNumber`, `formatProjectNumber`, `getDecisionsPath`, `getOutcomesDir` from paths.js imports
  - Removed `sanitizeProjectName` import (was only used in worktree path construction)
  - Removed `const worktreeMode = options.worktree ?? getWorktreeDefault()` from action handler
  - Removed `worktreeMode` parameter from `runPlanCommand()` signature and call site
  - Removed git validation block for worktree mode
  - Removed worktree path variables (`worktreePath`, `worktreeBranch`) and all worktree creation logic
  - Collapsed if/else into standard-mode-only project creation
  - Simplified shutdown handler (removed worktree cleanup branch)
  - Removed `worktreeMode` from `getPlanningPrompt()` call
  - Removed `cwd: worktreePath ?? undefined` from `runInteractive()` call
  - Simplified success message (removed worktree-specific branch)
  - Simplified `commitPlanningArtifacts()` call (removed `cwd` option)
  - Simplified finally block (removed worktree cleanup branch)

## Verification
- TypeScript compiles without errors
- No `worktreeMode` or dead worktree references remain in `runPlanCommand()`
- `runAmendCommand` and `runResumeCommand` retain their worktree support (still functional)

<promise>COMPLETE</promise>
