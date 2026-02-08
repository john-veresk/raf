# Outcome: Git Worktree Utility Functions

## Summary
Created `src/core/worktree.ts` module with all git worktree utility functions needed as the foundation for worktree support in RAF.

## Changes Made

### New Files
- **`src/core/worktree.ts`** - Core worktree utility module with 11 exported functions:
  - `getRepoRoot()` - Get the git toplevel directory
  - `getRepoBasename()` - Get the basename of the repo root (e.g., "myapp")
  - `getCurrentBranch()` - Get the current branch name
  - `computeWorktreePath(repoBasename, projectId)` - Compute `~/.raf/worktrees/<repo>/<project>` path
  - `computeWorktreeBaseDir(repoBasename)` - Compute `~/.raf/worktrees/<repo>/` path
  - `getWorktreeProjectPath(worktreePath, projectRelativePath)` - Compute project path inside worktree
  - `createWorktree(repoBasename, projectId)` - Create worktree with auto-created parent dir and new branch
  - `validateWorktree(worktreePath, projectRelativePath)` - Validate worktree existence, git status, project content
  - `mergeWorktreeBranch(branch, originalBranch)` - Merge with ff-first, fallback to merge-commit, abort on conflicts
  - `removeWorktree(worktreePath)` - Remove a single worktree (for failed-plan cleanup)
  - `listWorktreeProjects(repoBasename)` - List all worktree project directories for a repo

- **`tests/unit/worktree.test.ts`** - 30 unit tests covering all functions, error paths, and edge cases

### Interfaces Exported
- `WorktreeCreateResult` - Result of worktree creation
- `WorktreeMergeResult` - Result of branch merge (includes fastForward flag)
- `WorktreeValidation` - Validation result with exists/isValidWorktree/hasProjectFolder/hasPlans/projectPath

## Acceptance Criteria Verification
- [x] Worktree path computation returns `~/.raf/worktrees/<repo-basename>/<project-id>`
- [x] Parent directory `~/.raf/worktrees/<repo-basename>/` is created automatically
- [x] Worktree creation creates the directory and branch with correct names
- [x] Validation correctly identifies existing vs missing worktrees and checks for project content
- [x] Merge function tries fast-forward first, falls back to merge-commit, aborts on conflicts
- [x] Removal function removes a single worktree (for failed-plan cleanup only)
- [x] Listing function returns all worktree project directories for the current repo
- [x] Listing function returns empty array when no worktrees exist
- [x] All functions handle non-git-repo scenario gracefully
- [x] All functions handle errors and return meaningful messages

<promise>COMPLETE</promise>
