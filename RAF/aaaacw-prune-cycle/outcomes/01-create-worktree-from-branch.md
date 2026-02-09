# Outcome: Add createWorktreeFromBranch utility

## Summary

Added two new functions to `src/core/worktree.ts`:

1. **`branchExists(branchName)`** - Checks if a local git branch exists using `git branch --list`
2. **`createWorktreeFromBranch(repoBasename, projectId)`** - Creates a git worktree from an existing branch (using `git worktree add <path> <branch>` without the `-b` flag)

## Key Changes

### Files Modified
- `src/core/worktree.ts` - Added `branchExists()` and `createWorktreeFromBranch()` functions
- `tests/unit/worktree.test.ts` - Added 7 new test cases covering both functions

### Implementation Details
- `createWorktreeFromBranch()` reuses existing `computeWorktreePath()` and `computeWorktreeBaseDir()` helpers
- Returns `WorktreeCreateResult` (same interface as `createWorktree()`)
- Validates branch existence before attempting worktree creation
- Handles error cases: branch not found, parent directory creation failure, git command failure
- Existing `createWorktree()` is unchanged

### Test Coverage
- `branchExists`: existing branch, non-existing branch, git failure
- `createWorktreeFromBranch`: success path, branch-not-found, parent dir failure, worktree-already-exists

## Verification
- TypeScript compiles without errors
- All 43 worktree tests pass (36 existing + 7 new)
- 1 pre-existing failure in `planning-prompt.test.ts` (unrelated)

<promise>COMPLETE</promise>
