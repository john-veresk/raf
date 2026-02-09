# Project Decisions

## When should worktrees be cleaned up after execution?
Success only - Clean worktree only when all tasks complete successfully. Keep on failure for inspection.

## When cleaning up the worktree, should the git branch also be deleted, or kept for potential future amend?
Keep branch - Only remove the worktree directory. Keep the git branch so amend can find it later.

## For `raf plan --amend --worktree`: when the worktree doesn't exist but a branch matching the project name is found, should RAF automatically recreate the worktree or prompt the user first?
Auto-recreate silently - Automatically create a new worktree from the existing branch and continue. Just log an info message.

## For `raf do --worktree`: same scenario - worktree was cleaned up but branch exists. Should `raf do` also auto-recreate?
Keep current behaviour of raf do - no auto-recreate. Only amend should recreate worktrees.

## Should `createWorktreeFromBranch()` be a new function or extend existing `createWorktree()`?
New function - Add a separate `createWorktreeFromBranch()` function. Keeps create-new and create-from-existing as distinct operations.

## Should the worktree cleanup happen immediately after all tasks finish or after the merge step?
After tasks only - Always cleanup right after tasks finish, before merge. Merge operates on the branch, not the worktree directory.

## Should the 'branch not found' fallback be a new task or part of task 003?
Modify task 003 - Add the 'branch not found → create fresh worktree' fallback directly into the existing task 003 plan.

## When neither worktree nor branch exists during amend, what should happen?
Create fresh worktree + copy project folder from main repo into it, then continue the amend flow.
