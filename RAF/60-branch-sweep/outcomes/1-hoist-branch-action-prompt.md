# Outcome: Hoist branch action prompt before the execution loop

## Summary
Refactored the post-execution branch action prompt to appear once before the execution loop instead of per-project inside the loop. The chosen action now applies to all worktree projects uniformly.

## Changes Made

### `src/commands/do.ts`
- **Refactored `pickPostExecutionAction`**: Now accepts `string[]` (branch names) instead of a single worktree root path. Uses singular/plural wording based on count.
- **Hoisted prompt**: Moved the picker call before the `for (const project of projectsToRun)` loop. Collects all worktree branch names upfront and shows one prompt.
- **Removed per-project picker**: The `postAction` variable is now declared before the loop, removing the per-project `pickPostExecutionAction` call.
- **Moved PR preflight to `executePostAction`**: The `'pr'` case now runs `prPreflight` at execution time. If preflight fails for a specific project, only that project falls back to `leave` with worktree cleanup — other projects still get PRs.

### `tests/unit/post-execution-picker.test.ts`
- Updated all `pickPostExecutionAction` calls to pass `string[]` instead of a worktree root path.
- Added test for plural wording with multiple branches.
- Added test verifying singular wording for single branch.
- Removed preflight tests from picker (preflight moved to `executePostAction`).
- Added missing mock exports (`deleteLocalBranch`, `pushCurrentBranch`, `checkbox`).

## Verification
- `npx tsc --noEmit` passes (no type errors)
- All 14 post-execution-picker tests pass
- Pre-existing test failures in other suites are unrelated (claude-runner tests)

<promise>COMPLETE</promise>
