# Task: Add createWorktreeFromBranch utility

## Objective
Add a new `createWorktreeFromBranch()` function to `src/core/worktree.ts` that creates a git worktree from an existing branch, and a `branchExists()` helper to check if a branch exists locally.

## Context
Currently `createWorktree()` always creates a new branch (`git worktree add -b`). The new amend flow needs to recreate a worktree from an existing branch after the worktree was cleaned up post-execution. This is a prerequisite for both the cleanup feature (branch must survive worktree removal) and the amend recreation feature.

## Requirements
- Add `branchExists(branchName: string): boolean` function that checks if a local branch exists
- Add `createWorktreeFromBranch(repoBasename: string, projectId: string): WorktreeCreateResult` that uses `git worktree add <path> <existing-branch>` (no `-b` flag) to attach a worktree to an existing branch
- Reuse the same `WorktreeCreateResult` interface and `computeWorktreePath` logic
- Handle error cases: branch doesn't exist, worktree path already exists, git command failure
- Add unit tests covering success path, branch-not-found, and worktree-already-exists scenarios

## Implementation Steps
1. Add `branchExists()` helper using `git branch --list <name>`
2. Add `createWorktreeFromBranch()` function - same structure as `createWorktree()` but uses `git worktree add <path> <branch>` without the `-b` flag
3. Export both new functions
4. Add tests in the worktree test file

## Acceptance Criteria
- [ ] `branchExists()` correctly detects existing and non-existing branches
- [ ] `createWorktreeFromBranch()` creates a worktree attached to an existing branch
- [ ] Returns appropriate error when branch doesn't exist
- [ ] All new and existing tests pass
- [ ] TypeScript compiles without errors

## Notes
- The existing `createWorktree()` function should remain unchanged - it's used by `raf plan --worktree` for new projects
- The branch name matches the project folder name (e.g., `022-prune-cycle`)
