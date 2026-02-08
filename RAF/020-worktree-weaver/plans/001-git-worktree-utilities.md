# Task: Git Worktree Utility Functions

## Objective
Create a new module with git worktree utility functions that handle path computation, worktree creation, validation, merge, and removal.

## Context
This is the foundation task for worktree support. All other worktree tasks depend on these utilities. The module follows the pattern of the existing `src/core/git.ts` module - standalone functions using `execSync` for git operations.

## Requirements
- Compute worktree path: `~/.raf/worktrees/<repo-basename>/<project-id>` where `<repo-basename>` is the basename of `process.cwd()` (the repo root, e.g., `myapp`) and `<project-id>` is the full project folder name (e.g., `020-worktree-weaver`)
- Create the `~/.raf/worktrees/<repo-basename>/` directory automatically if it doesn't exist
- Create a git worktree at the computed path with a new branch named after the full project folder (e.g., `020-worktree-weaver`)
- Validate that a worktree directory exists and is a valid git worktree (check `git worktree list`)
- Validate that the project folder and plan files exist inside the worktree
- Compute the project path inside the worktree (same relative path from repo root as in the main repo)
- Merge: merge the worktree branch into the original branch. Attempt fast-forward first; if not possible, allow a merge-commit. On merge conflicts, run `git merge --abort` and return failure with a message for the user to merge manually
- Remove a worktree: run `git worktree remove` to remove a single worktree directory (used only for failed-plan cleanup, NOT for post-completion cleanup)
- Get current branch name (for recording which branch the worktree was created from)
- List all worktree project directories for a given repo: scan `~/.raf/worktrees/<repo-basename>/` and return the list of project folder names (e.g., `['020-worktree-weaver', '021-another-feature']`). Return an empty array if the directory doesn't exist or is empty
- All functions should handle errors gracefully and return meaningful error messages
- Follow the same patterns as `src/core/git.ts` - use `execSync` with `stdio: 'pipe'`, wrap in try/catch

## Implementation Steps
1. Create `src/core/worktree.ts` module
2. Implement path computation function that derives `~/.raf/worktrees/<repo-basename>/<project-id>` using `os.homedir()`, the basename of the git toplevel, and the project folder name
3. Implement worktree creation function that ensures the parent directory exists and runs `git worktree add <path> -b <branch-name>`
4. Implement validation function that checks worktree existence in `git worktree list` output AND checks for project folder + plans inside
5. Implement merge function that: switches to the original branch, runs `git merge --ff-only <project-branch>`, if ff fails tries `git merge <project-branch>`, if conflicts arise runs `git merge --abort` and returns failure with manual-merge instructions
6. Implement removal function that runs `git worktree remove <path>` for a single worktree (used only for failed-plan cleanup)
7. Implement helper to get the repo root directory name (basename of git toplevel)
8. Implement function to list all worktree project directories under `~/.raf/worktrees/<repo-basename>/` - read the directory, filter to valid project folder names, return sorted list
9. Export all functions as named exports

## Acceptance Criteria
- [ ] Worktree path computation returns `~/.raf/worktrees/<repo-basename>/<project-id>`
- [ ] Parent directory `~/.raf/worktrees/<repo-basename>/` is created automatically
- [ ] Worktree creation creates the directory and branch with correct names
- [ ] Validation correctly identifies existing vs missing worktrees and checks for project content
- [ ] Merge function tries fast-forward first, falls back to merge-commit, aborts on conflicts
- [ ] Removal function removes a single worktree (for failed-plan cleanup only)
- [ ] Listing function returns all worktree project directories for the current repo
- [ ] Listing function returns empty array when no worktrees exist
- [ ] All functions handle non-git-repo scenario gracefully
- [ ] All functions handle errors and return meaningful messages

## Notes
- The worktree path is now under the user's home directory (`~/.raf/worktrees/`), not relative to the repo. For example, if the repo is at `/Users/me/projects/myapp`, the worktree would be at `~/.raf/worktrees/myapp/020-worktree-weaver`
- The merge function needs to be called from the ORIGINAL repo (not the worktree) because it needs to switch to the original branch
- The branch name is the full project folder name (e.g., `020-worktree-weaver`), not just the project name
- Use `os.homedir()` to resolve `~` to the actual home directory path
- The removal function is only used for cleaning up failed/cancelled planning — NOT for post-completion cleanup. Worktrees persist after task completion and merge
