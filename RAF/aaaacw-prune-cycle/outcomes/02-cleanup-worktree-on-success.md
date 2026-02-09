# Outcome: Clean up worktree after successful execution

## Summary

Added automatic worktree cleanup to `raf do --worktree` when all tasks complete successfully. The worktree directory is removed but the git branch is preserved for future `raf plan --amend --worktree` operations.

## Key Changes

### Files Modified
- `src/commands/do.ts` - Added worktree cleanup logic after `executeSingleProject()` returns, before the `--merge` step. Imported `removeWorktree` from worktree module.
- `src/core/worktree.ts` - Updated `removeWorktree()` JSDoc to reflect its use for both failed-plan cleanup and post-completion cleanup.
- `CLAUDE.md` - Updated worktree lifecycle documentation to reflect automatic cleanup on success.
- `tests/unit/do-worktree-cleanup.test.ts` - New test file with 8 tests covering cleanup behavior.

### Implementation Details
- Cleanup condition: `worktreeMode && worktreeRoot && result.success`
- On success: calls `removeWorktree(worktreeRoot)` and logs "Cleaned up worktree: <path>"
- On cleanup failure: logs a warning via `logger.warn()` but does NOT exit with error
- On task failure: worktree is kept for inspection (cleanup not triggered)
- Cleanup happens BEFORE the `--merge` step — merge operates on the branch name, not the worktree directory

### Test Coverage
- `removeWorktree preserves branch`: verifies only `git worktree remove` is called, no branch deletion
- `cleanup decision logic` (4 tests): verifies cleanup conditions (worktreeMode, worktreeRoot, result.success)
- `cleanup failure handling` (2 tests): verifies error/success result from removeWorktree
- `merge after cleanup`: verifies merge uses branch name, not worktree directory path

## Verification
- TypeScript compiles without errors
- All 879 tests pass (871 existing + 8 new), 1 pre-existing failure in `planning-prompt.test.ts` (unrelated)
- No regressions introduced

<promise>COMPLETE</promise>
