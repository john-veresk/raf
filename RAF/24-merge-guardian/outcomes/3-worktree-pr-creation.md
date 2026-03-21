# Outcome: Add PR Creation from Worktree

## Summary

Added a reusable `src/core/pull-request.ts` module that creates GitHub Pull Requests from worktree branches using the `gh` CLI tool, with Claude Haiku-generated PR bodies.

## Changes Made

### New Module: `src/core/pull-request.ts`
- **`createPullRequest(branch, projectPath, options?)`**: Main entry point - runs preflight checks, detects base branch, auto-pushes branch, generates PR body via Claude Haiku, and calls `gh pr create`
- **`prPreflight(branch, cwd?)`**: Validates prerequisites - gh CLI installed, authenticated, GitHub remote present, branch push status
- **`generatePrBody(projectPath, timeoutMs?)`**: Reads input.md, decisions.md, and outcome files, then calls Claude Haiku to generate a summary. Falls back to simple body if Claude is unavailable
- **`generatePrTitle(projectPath)`**: Converts project name from kebab-case to human-readable (e.g., "merge-guardian" -> "Merge guardian")
- **`detectBaseBranch(cwd?)`**: Auto-detects base branch from `refs/remotes/origin/HEAD`, falling back to checking `main` then `master`
- **`readProjectContext(projectPath)`**: Reads input.md, decisions.md, and outcome files for context
- Helper functions: `isGhInstalled()`, `isGhAuthenticated()`, `isGitHubRemote()`, `isBranchPushed()`, `pushBranch()`
- All git-related functions accept optional `cwd` parameter for worktree support

### New Tests: `tests/unit/pull-request.test.ts`
- 43 tests covering all exported functions
- Tests for: gh CLI detection, authentication check, GitHub remote detection, branch push status, base branch detection (with fallback chain), preflight checks, PR title generation, project context reading, PR body generation (with Claude fallback), full PR creation flow (success, failures, cwd passthrough)
- Follows existing mock patterns: `jest.unstable_mockModule()` for ESM, mocks `child_process`, `fs`, `logger`

### Documentation: `CLAUDE.md`
- Added "PR Creation from Worktree" section under Architectural Decisions

## Test Results

- All 896 tests pass (43 test suites)
  - 853 existing tests: passing
  - 43 new tests: passing
- Build succeeds with no type errors

## Notes

- This module is a standalone utility - it will be consumed by the post-execution picker (task 004)
- PR body generation uses Claude Haiku for cost efficiency, with a configurable timeout (default 60s)
- If Claude CLI is unavailable, falls back to a simple body with project input and task count
- Branch is automatically pushed to origin if not already pushed before PR creation

<promise>COMPLETE</promise>
