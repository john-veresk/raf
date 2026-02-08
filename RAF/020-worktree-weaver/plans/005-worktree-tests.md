# Task: Add Tests for Worktree Functionality

## Objective
Add comprehensive tests covering the worktree utilities and the integration of `--worktree` and `--merge` flags into plan and do commands.

## Context
RAF uses Jest with ts-jest ESM preset. Existing tests are in `__tests__/` directories. The worktree functionality involves git operations that need careful testing with real temporary git repos.

## Dependencies
001, 002, 003, 004

## Requirements
- Unit tests for all worktree utility functions in `src/core/worktree.ts`:
  - Path computation (given repo name and project folder, verify correct worktree path)
  - Worktree creation (use a temporary git repo)
  - Worktree validation (existing vs non-existing)
  - Merge (fast-forward success, merge-commit fallback, and conflict/abort cases)
  - Removal (for failed-plan cleanup scenario only)
- Integration-level tests for command behavior:
  - `raf do --worktree` with multiple projects should error
  - `raf do --worktree` with no worktree should error with helpful message
  - `raf do --merge` without `--worktree` should error
- Test edge cases:
  - Worktree path computation when repo has special characters in name
  - Merge when original branch has diverged (merge-commit should be created)
  - Merge with conflicts (should abort and return failure)
- Use temporary directories and real git repos for git operation tests (create temp dir, `git init`, add commits, etc.)
- Follow existing test patterns in the project

## Implementation Steps
1. Create `src/core/__tests__/worktree.test.ts` for unit tests of utility functions
2. Write tests for path computation (pure function, no git needed)
3. Write tests for worktree creation/validation/merge/removal using temporary git repos
4. Create test helpers for setting up temporary git repos with commits
5. Write tests for CLI validation (--worktree and --merge flag behavior)
6. Ensure all tests clean up their temporary directories

## Acceptance Criteria
- [ ] All worktree utility functions have unit tests
- [ ] Path computation tested with various repo and project names
- [ ] Worktree creation tested with real temporary git repo
- [ ] Merge tested for ff success, merge-commit fallback, and conflict/abort
- [ ] Removal tested for failed-plan cleanup scenario
- [ ] CLI validation tests for error cases (--merge without --worktree, etc.)
- [ ] All tests pass with `npm test`
- [ ] Tests clean up temporary files/directories

## Notes
- Creating temporary git repos for testing: use `fs.mkdtempSync` + `execSync('git init')` + add a commit
- For worktree tests, the base repo needs at least one commit before `git worktree add` will work
- Be careful with `process.cwd()` in tests - some utilities may depend on it. Consider mocking or using `chdir` carefully
- Reference existing test files in the project for patterns and conventions
