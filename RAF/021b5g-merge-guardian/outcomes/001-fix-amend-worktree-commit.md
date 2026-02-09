# Outcome: Fix Amend Worktree Commit Bug

## Summary

Fixed the bug where `input.md` and `decisions.md` changes were not committed when running `raf plan --amend --worktree`. The fix addresses two root causes in `commitPlanningArtifacts()`:

1. **Absolute path resolution in worktrees**: Converted file paths from absolute to relative when `cwd` is provided (worktree mode). This avoids potential path resolution mismatches between Node.js and git, particularly on macOS where symlinks (e.g., `/tmp` → `/private/tmp`) can cause absolute paths to not match git's internal worktree path tracking.

2. **All-or-nothing staging failure**: Changed from a single `git add` call with all files to individual `git add` calls per file. Previously, if any single file failed to stage (e.g., missing `decisions.md`), the entire `git add` command failed with exit code 128, meaning NO files were staged — including `input.md` which was always modified.

## Root Cause Analysis

The `commitPlanningArtifacts()` function used absolute paths for `git add` even when operating in a worktree. While this works in simple cases, it can fail when:
- macOS path symlink resolution causes the absolute path to differ from git's internal representation
- One file in the batch doesn't exist (e.g., `decisions.md` not yet written by Claude), causing `git add` to fail for ALL files

Evidence: commit `60d6565` ("missed desicions") shows that project 022's amend produced updated `input.md` and `decisions.md` that were never committed by `commitPlanningArtifacts`, requiring a manual commit.

## Changes Made

### `src/core/git.ts`
- Convert absolute file paths to relative (via `path.relative(cwd, file)`) when `cwd` is provided
- Stage files individually with separate `git add` calls per file
- Add per-file error handling so one failed staging doesn't block others
- Add early return when no files are successfully staged

### `tests/unit/commit-planning-artifacts.test.ts`
- Updated existing tests for individual `git add` call behavior
- Added tests for: relative path conversion in worktree mode, absolute paths in standard mode, partial staging failure recovery, total staging failure handling, additional file path conversion in worktree mode

### `tests/unit/commit-planning-artifacts-worktree.test.ts` (new)
- Real git repo integration tests covering:
  - Basic worktree commit (input.md + decisions.md)
  - Amend with additional plan files in worktree
  - Commit after worktree recreation from branch (the exact bug scenario)
  - Partial file changes (only some files modified)
  - Non-worktree standard mode (regression check)

## Test Results

- All 852 tests pass (842 existing + 10 new)
- Build succeeds with no type errors
- No regressions in existing functionality

<promise>COMPLETE</promise>
