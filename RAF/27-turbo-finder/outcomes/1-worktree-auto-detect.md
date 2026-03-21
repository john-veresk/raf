# Outcome: Auto-detect worktree projects in `raf do`

## Summary

Implemented automatic worktree project detection in `raf do <identifier>` so that the `--worktree` flag is no longer required when running worktree projects by name, ID, or full folder name.

## Key Changes

### `src/core/worktree.ts`
- Added `resolveWorktreeProjectByIdentifier()` function that matches a project identifier against worktree folder names using the same resolution strategy as `resolveProjectIdentifierWithDetails`:
  1. Full folder name match (exact, case-insensitive)
  2. Base26 prefix match (6-char ID)
  3. Project name match (portion after prefix)
- Added `WorktreeProjectResolution` interface for the return type
- Added import of `extractProjectNumber`, `extractProjectName`, `isBase26Prefix`, `decodeBase26` from paths utility

### `src/commands/do.ts`
- Modified the standard (non-worktree) resolution path to check worktrees FIRST, then fall back to main repo
- When a worktree match is found, auto-enables worktree mode: sets `worktreeMode = true`, `worktreeRoot`, `originalBranch`
- This triggers the full worktree flow: post-execution action picker, worktree cwd, and cleanup
- Changed `resolvedProject` type to `| undefined` to support the two-step resolution (worktree then main)
- Added import for `resolveWorktreeProjectByIdentifier`

### `tests/unit/worktree.test.ts`
- Added 11 test cases for `resolveWorktreeProjectByIdentifier`:
  - Full folder name match (exact and case-insensitive)
  - Base26 prefix match
  - Project name match (case-insensitive)
  - No match / no worktree projects
  - Ambiguous name match returns null
  - Correct worktreeRoot path

### `tests/unit/post-execution-picker.test.ts`
- Added `resolveWorktreeProjectByIdentifier` to the worktree module mock to prevent import failure

## Test Results

All 45 test suites pass (971 tests total, 0 failures).

<promise>COMPLETE</promise>
