# Task: Clean up worktree after successful execution

## Objective
Add automatic worktree cleanup to `raf do --worktree` when all tasks complete successfully, preserving the git branch for future amend operations.

## Context
Currently worktrees persist indefinitely after execution. Since the git branch contains all committed work, the worktree directory is redundant after successful completion. Cleaning it up reduces clutter in `~/.raf/worktrees/`. The branch is intentionally kept so `raf plan --amend --worktree` can recreate the worktree later.

## Dependencies
001

## Requirements
- After `executeSingleProject()` returns successfully in worktree mode, remove the worktree using `removeWorktree()`
- Cleanup happens immediately after tasks finish, BEFORE the `--merge` step (merge operates on the branch, not the worktree directory)
- Only clean up on success (all tasks completed). Keep worktree on failure for inspection
- Do NOT delete the git branch - only remove the worktree directory
- Log a message when cleanup happens (e.g., "Cleaned up worktree: <path>")
- If cleanup fails, log a warning but don't fail the overall command

## Implementation Steps
1. In `src/commands/do.ts`, after `executeSingleProject()` returns, check if worktree mode is active and result is successful
2. Call `removeWorktree(worktreeRoot)` to clean up the directory
3. Log appropriate success/warning messages
4. Continue to the merge step (which uses the branch, not the worktree directory)
5. Add/update tests for the do command's cleanup behavior

## Acceptance Criteria
- [ ] Worktree directory is removed after successful execution with `--worktree`
- [ ] Git branch is preserved after worktree cleanup
- [ ] Worktree is NOT cleaned up on failure
- [ ] `--merge` still works after worktree cleanup (operates on branch)
- [ ] Cleanup failure produces a warning, not an error exit
- [ ] All tests pass

## Notes
- The `removeWorktree()` function already exists in `src/core/worktree.ts`
- The merge step in `do.ts` already uses the branch name (`path.basename(worktreeRoot)`), not the worktree directory itself, so merge should work after cleanup
- Consider that `raf status` auto-discovers worktree directories - after cleanup, the project will no longer appear in the worktrees section of status output (this is expected)
