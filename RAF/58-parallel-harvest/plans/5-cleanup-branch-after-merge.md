---
effort: low
---
# Task: Clean Up Branch After Worktree Merge

## Objective
Automatically delete the local worktree branch and prune stale worktree metadata after a successful merge.

## Context
This is a follow-up to task 4. See outcome: /Users/eremeev/.raf/worktrees/RAF/58-parallel-harvest/RAF/58-parallel-harvest/outcomes/4-amend-worktree-creation.md

Currently, after a successful worktree merge in the post-execution flow, the worktree directory is removed via `removeWorktree()` but the git branch is preserved. Over time this leads to accumulation of stale merged branches in the local repo. The `removeWorktree()` function in `src/core/worktree.ts` (line ~367) explicitly only calls `git worktree remove` and preserves the branch.

## Dependencies
4 (see outcomes/4-amend-worktree-creation.md)

## Requirements
- After a successful merge, automatically delete the local branch (no user prompt)
- Only delete the branch on the **merge** post-execution action — PR and leave-as-is must preserve the branch
- Run `git worktree prune` after worktree removal to clean up stale `.git/worktrees/` entries
- Do NOT delete remote branches — only local cleanup
- Fail gracefully: if branch deletion or pruning fails, log a warning but don't fail the overall flow

## Implementation Steps
1. **Add `deleteLocalBranch()` helper to `src/core/worktree.ts`**:
   - Run `git branch -d <branchName>` (safe delete — only works if branch is fully merged)
   - If `-d` fails (e.g., branch not fully merged edge case), fall back to `git branch -D <branchName>` since we just merged it
   - Return success/failure, log warning on failure

2. **Add `pruneWorktrees()` helper to `src/core/worktree.ts`**:
   - Run `git worktree prune` in the main repo directory
   - Return success/failure, log warning on failure

3. **Update `removeWorktree()` in `src/core/worktree.ts`**:
   - After the existing `git worktree remove` call, add a call to `pruneWorktrees()`
   - This ensures pruning happens for all worktree removals (merge, PR, leave)

4. **Update the merge action in `executePostAction()` in `src/commands/do.ts`** (around line 554):
   - After the successful merge + `removeWorktree()` call, add a call to `deleteLocalBranch()` with the worktree branch name
   - Only in the merge path — not in the PR or leave-as-is paths
   - Log a success message like `"Deleted merged branch: <branchName>"`

5. **Update tests in `tests/unit/do-worktree-cleanup.test.ts`**:
   - Update existing test that asserts `removeWorktree()` should NOT call `git branch -d` — this behavior is now in a separate function called from `do.ts`, not from `removeWorktree()` itself
   - Add test: after successful merge action, `deleteLocalBranch()` is called with the correct branch name
   - Add test: after PR action, `deleteLocalBranch()` is NOT called
   - Add test: after leave-as-is action, `deleteLocalBranch()` is NOT called
   - Add test: `pruneWorktrees()` is called as part of `removeWorktree()`
   - Add test: branch deletion failure logs warning but doesn't throw

## Acceptance Criteria
- [ ] Local branch is automatically deleted after successful worktree merge
- [ ] Branch is NOT deleted after PR or leave-as-is actions
- [ ] `git worktree prune` runs after every worktree removal
- [ ] Failures in branch deletion or pruning are logged as warnings, not errors
- [ ] Existing tests updated, new tests added and passing
