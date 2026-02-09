# Outcome: Add Post-Execution Picker for Worktree Mode

## Summary

Replaced the `--merge` CLI flag with an interactive post-execution picker shown before task execution in worktree mode. Users now choose upfront what happens after tasks complete: merge, create PR, or leave the branch.

## Changes Made

### `src/commands/do.ts`
- Removed `--merge` Commander.js option
- Added `PostExecutionAction` type (`'merge' | 'pr' | 'leave'`)
- Added `pickPostExecutionAction()` — interactive picker using `@inquirer/prompts` `select`, shown before task execution begins
  - If "Create PR" is chosen, runs `prPreflight()` immediately; falls back to "leave" if preflight fails (e.g., `gh` not installed)
- Added `executePostAction()` — dispatches the chosen action after all tasks succeed:
  - **merge**: cleans up worktree, merges branch into original (same behavior as old `--merge`)
  - **pr**: creates GitHub PR via `createPullRequest()` from task 003's module; preserves worktree for follow-up
  - **leave**: cleans up worktree directory (branch preserved)
- Refactored post-execution flow: old `mergeMode` boolean replaced with `postAction` variable
- On failure, skips post-action with informational message (only for non-leave actions)
- Added import for `createPullRequest` and `prPreflight` from `pull-request.ts`

### `src/types/config.ts`
- Removed `merge?: boolean` from `DoCommandOptions` interface

### `tests/unit/post-execution-picker.test.ts` (new)
- 16 tests covering:
  - Picker presents three choices with correct labels and values
  - Returns correct action for each choice
  - PR preflight runs only for PR choice
  - Falls back to "leave" when PR preflight fails
  - Branch name extracted from worktree path for picker message
  - Action dispatch logic: merge cleans up, PR preserves worktree, leave cleans up
  - Action skip logic on failure (skip for merge/PR, silent for leave)

### `tests/unit/worktree-integration.test.ts`
- Replaced `--merge requires --worktree` test section with `post-execution picker is worktree-only` tests
- Tests verify picker is shown only when worktreeMode && worktreeRoot are both set

### `tests/unit/do-worktree-cleanup.test.ts`
- Updated comment block to describe new cleanup flow (post-action based instead of `--merge` based)

### `CLAUDE.md`
- Updated Worktree Mode section: replaced `--merge` documentation with post-execution picker documentation
- Documented three picker options, preflight behavior, cleanup rules, and exported symbols

## Test Results

- All 912 tests pass (44 test suites)
  - 896 existing tests: passing
  - 16 new tests: passing
- Build succeeds with no type errors

<promise>COMPLETE</promise>
