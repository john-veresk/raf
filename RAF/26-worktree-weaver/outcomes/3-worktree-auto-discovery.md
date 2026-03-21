# Outcome: Auto-Discover Worktree Projects in raf do

## Summary

Made `raf do` (without `--worktree` flag) automatically discover pending worktree projects from `~/.raf/worktrees/<repo-basename>/` and merge them into the interactive project picker. Selecting a worktree project auto-switches to worktree mode with post-action picker.

## Key Changes

- **`src/ui/project-picker.ts`**:
  - Added `ProjectSource` type (`'local' | 'worktree'`) and `source`/`worktreeRoot` fields to `PendingProjectInfo`
  - Added `PickerResult` interface for typed picker return values (folder, source, worktreeRoot)
  - Added `getPendingWorktreeProjects()` function that scans worktree directories and returns pending projects
  - Updated `formatProjectChoice()` to append `[worktree]` suffix for worktree-sourced projects
  - Updated `pickPendingProject()` to accept optional worktree projects, deduplicate by folder (preferring worktree), sort chronologically, and return `PickerResult`

- **`src/commands/do.ts`**:
  - When no project identifier is provided (and `--worktree` not set), discovers worktree projects via `getPendingWorktreeProjects()` and passes them to the picker
  - When a worktree project is selected, auto-switches: sets `worktreeMode = true`, `worktreeRoot`, and `originalBranch`
  - This enables the full worktree execution flow (worktree cwd, post-action picker, post-action execution)

- **`CLAUDE.md`**: Updated worktree documentation to reflect auto-discovery behavior

- **`tests/unit/project-picker.test.ts`**: Updated and expanded from 20 to 26 tests:
  - Updated 4 existing `pickPendingProject` tests for new `PickerResult` return type
  - Added 1 test for `source: 'local'` on `getPendingProjects`
  - Added 2 tests for `formatProjectChoice` worktree labeling
  - Added 5 tests for `getPendingWorktreeProjects` (empty, metadata, completed skip, invalid folder, missing path)
  - Added 4 tests for picker merging, deduplication, chronological sorting, and backwards compatibility

## Test Results

All 945 tests pass (45 suites).

<promise>COMPLETE</promise>
