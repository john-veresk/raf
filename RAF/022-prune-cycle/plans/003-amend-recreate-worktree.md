# Task: Auto-recreate worktree from existing branch in amend flow

## Objective
When `raf plan --amend --worktree` is run and the worktree directory doesn't exist, automatically recreate it — either from an existing branch or by creating a fresh worktree and copying project files from the main repo.

## Context
After task 002, worktrees are cleaned up on successful execution but branches are preserved. When a user wants to amend a completed worktree project, the amend command needs to detect this situation and recreate the worktree. Currently, amend in worktree mode searches existing worktree directories and fails if none is found. There are two fallback scenarios to handle:
1. Branch exists → recreate worktree from that branch (most common after cleanup)
2. Neither branch nor worktree exists → create a fresh worktree with a new branch and copy the project files from the main repo

## Dependencies
001, 002

## Requirements
- In `runAmendCommand()` when `worktreeMode` is true, after the existing worktree search fails to find the project:
  1. Resolve the project identifier from the main repo to get the project folder name
  2. Check if a branch matching that folder name exists using `branchExists()`
  3. **If branch exists**: call `createWorktreeFromBranch()` to recreate the worktree. Log an info message like "Recreated worktree from branch: <branch>"
  4. **If branch does NOT exist**: call the regular `createWorktree()` to create a fresh worktree with a new branch, then copy the project folder (`RAF/<project>/`) from the main repo into the new worktree. Log an info message about creating a fresh worktree.
  5. Continue the amend flow with the recreated/new worktree path
- The recreated worktree (from branch) should already contain the project files since they're on the branch
- The fresh worktree (no branch) needs the project files copied over from the main repo
- Both paths should seamlessly continue into the normal amend planning flow

## Implementation Steps
1. In `src/commands/plan.ts`, modify the `runAmendCommand()` worktree resolution logic
2. After the existing worktree search loop finds no match, add a two-tier fallback:
   - First, check for existing branch with `branchExists(folderName)`
   - If branch found: call `createWorktreeFromBranch(repoBasename, folderName)`
   - If no branch: call `createWorktree(repoBasename, folderName)`, then copy the `RAF/<project>/` directory from the main repo into the new worktree
3. Set `worktreePath` and resolve `projectPath` inside the new worktree
4. Import the new functions from `worktree.ts`
5. Add tests covering: branch found and worktree recreated, no branch found and fresh worktree created with project files copied, neither scenario errors

## Acceptance Criteria
- [ ] `raf plan --amend --worktree <project>` works when worktree was cleaned up but branch exists
- [ ] `raf plan --amend --worktree <project>` works when neither worktree nor branch exists — creates fresh worktree and copies project files
- [ ] Recreated worktree (from branch) contains the project files from the branch
- [ ] Fresh worktree (no branch) contains project files copied from the main repo
- [ ] Info messages are logged about which path was taken (recreate from branch vs. fresh worktree)
- [ ] Existing amend flow (worktree still exists) continues to work unchanged
- [ ] All tests pass

## Notes
- The project folder name IS the branch name (e.g., `022-prune-cycle`)
- The main repo may or may not have the project folder — worktree-only projects exist only on the branch
- For the "no branch" fallback, the project MUST exist in the main repo (otherwise there's nothing to copy) — if it doesn't, show an error
- After `createWorktreeFromBranch()`, the worktree should have all the files from the branch including `RAF/<project>/plans/`, `outcomes/`, etc.
- After `createWorktree()` + copy, the new worktree will have the project files but on a fresh branch based on the current HEAD
- Update CLAUDE.md documentation about the worktree lifecycle to mention both recreate-on-amend scenarios
