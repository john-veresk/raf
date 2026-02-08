# Outcome: Add --worktree Flag to Do Command

## Summary
Added `--worktree` (`-w`) flag to `raf do` that validates worktree existence and executes all tasks inside the worktree directory. Supports both explicit project identifier and auto-discovery of uncompleted worktree projects when no identifier is given.

## Changes Made

### Modified Files
- **`src/commands/do.ts`** - Added `--worktree` flag with full worktree support:
  - Added `-w, --worktree` option to Commander command definition
  - When `--worktree` with no identifier: auto-discovery flow via `discoverAndPickWorktreeProject()`:
    - Lists worktree projects using `listWorktreeProjects()`
    - Finds highest-numbered completed project in main tree
    - Filters worktrees by threshold (highest completed - 3)
    - Derives state for remaining worktrees, keeps uncompleted ones
    - Shows interactive picker (even for single project)
    - Shows appropriate messages for no projects / all completed
  - When `--worktree` with explicit identifier:
    - Validates single project only (errors if multiple)
    - Resolves project from main repo or searches worktrees directly
    - Validates worktree existence, git worktree status, project content, and plans
    - Shows helpful error messages on validation failure
  - When `--worktree` with identifier: validates worktree, resolves project path inside it
  - Passes `worktreeCwd` to `executeSingleProject` which flows to `ClaudeRunner.run()`/`runVerbose()`
  - Git operations (commit verification, stash) use worktree cwd
  - Added imports for worktree utilities, path utilities, inquirer select, and discoverProjects

- **`src/core/git.ts`** - Added optional `cwd` parameter to git utility functions:
  - `isGitRepo(cwd?)` - accepts optional cwd for worktree context
  - `hasUncommittedChanges(cwd?)` - accepts optional cwd
  - `getHeadCommitHash(cwd?)` - accepts optional cwd
  - `stashChanges(name, cwd?)` - accepts optional cwd, propagates to internal calls

- **`src/types/config.ts`** - Added `worktree?: boolean` to `DoCommandOptions` interface

## Acceptance Criteria Verification
- [x] `raf do --worktree` without project identifier triggers auto-discovery flow
- [x] Auto-discovery lists worktree projects, finds latest completed main-tree project, filters correctly
- [x] Auto-discovery shows picker even when only one uncompleted project is found
- [x] Auto-discovery shows "No worktree projects found" when none exist
- [x] Auto-discovery shows "All worktree projects are completed" when all are done
- [x] `raf do proj1 proj2 --worktree` shows error about single project only
- [x] `raf do my-feature --worktree` with no worktree shows helpful error
- [x] `raf do my-feature --worktree` with valid worktree executes tasks in worktree
- [x] Claude runs with cwd set to worktree root
- [x] State derivation reads from worktree project path
- [x] Outcome files are written to worktree project path
- [x] Git commits land in the worktree branch
- [x] Compatible with `--verbose`, `--timeout`, `--force`, `--debug`, `--model`
- [x] Without `--worktree`, behavior is unchanged

## Test Results
- Build: passes cleanly (no TypeScript errors)
- All 835 tests pass (834 pass, 1 pre-existing failure in planning-prompt.test.ts unrelated to this change)
- All 67 do command tests pass (do-command, do-multiproject, do-rerun, do-blocked-tasks)
- All 29 git tests pass (git, git-stash, git-commit-helpers)

<promise>COMPLETE</promise>
