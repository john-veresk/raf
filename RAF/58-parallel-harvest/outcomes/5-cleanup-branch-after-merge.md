# Cleanup Branch After Merge

## Summary
Added automatic local branch deletion and worktree pruning after a successful worktree merge, preventing stale branch accumulation in the local repo.

## Changes

### `src/core/worktree.ts`
- Added `deleteLocalBranch(branchName)` — runs `git branch -d`, falls back to `-D` on failure (safe since merge succeeded), returns success/failure
- Added `pruneWorktrees()` — runs `git worktree prune`, returns success/failure
- Updated `removeWorktree()` — now calls `pruneWorktrees()` after successful `git worktree remove` (every removal path benefits)

### `src/commands/do.ts`
- Imported `deleteLocalBranch` from `worktree.js`
- In `executePostAction()` merge case: after a successful merge, calls `deleteLocalBranch(worktreeBranch)` and logs success/warning
- PR and leave-as-is paths are unchanged — branch preserved

### `tests/unit/do-worktree-cleanup.test.ts`
- Updated `removeWorktree` test to expect 2 calls (worktree remove + prune) instead of 1
- Added `deleteLocalBranch` tests: safe delete, force-delete fallback, both fail
- Added `pruneWorktrees` tests: success and failure
- Fixed `mergeWorktreeBranch` test to use `await` (function became async in task 3)
- Added transitive mocks for `runner-factory` and `config.js`

## Notes
- All 13 tests in `do-worktree-cleanup.test.ts` pass
- All 74 tests in `worktree.test.ts` pass
- Pre-existing failures in `claude-runner.test.ts` and others are unrelated

<promise>COMPLETE</promise>
