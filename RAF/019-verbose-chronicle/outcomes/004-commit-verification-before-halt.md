# Outcome: Commit Verification Before Halt

## Summary
Added commit verification to the grace period logic so that when a COMPLETE marker is detected, the system verifies the expected git commit has actually landed before terminating. If the commit hasn't landed within the initial 60-second grace period, it extends polling up to a hard maximum of 180 seconds.

## Changes Made

### `src/core/git.ts`
- **`getHeadCommitHash()`**: Returns the current HEAD commit hash (or null if not in a git repo)
- **`getHeadCommitMessage()`**: Returns the HEAD commit message first line (or null)
- **`isFileCommittedInHead(filePath)`**: Checks if a file exists in HEAD's tree using `git ls-tree`

### `src/core/claude-runner.ts`
- **New exports**: `COMPLETION_HARD_MAX_MS` (180s), `COMMIT_POLL_INTERVAL_MS` (10s), `CommitContext` interface
- **New `commitContext` field in `ClaudeRunnerOptions`**: Allows passing pre-execution HEAD hash, expected commit prefix, and outcome file path
- **`verifyCommit()` helper**: Checks all three conditions (HEAD changed, message prefix matches, outcome file committed)
- **Updated `createCompletionDetector()`**: Accepts optional `commitContext` parameter. On grace period expiry:
  - If COMPLETE marker and `commitContext` provided: verifies commit before killing
  - If commit not verified: starts polling every 10s up to 180s total
  - If FAILED marker or no `commitContext`: kills immediately (existing behavior)
- **Both `run()` and `runVerbose()`**: Pass `commitContext` through to completion detector

### `src/commands/do.ts`
- **Captures HEAD hash** before each task execution attempt using `getHeadCommitHash()`
- **Builds `commitContext`** with `preExecutionHead`, `expectedPrefix` (e.g., `RAF[005:001]`), and `outcomeFilePath`
- **Passes `commitContext`** to both `run()` and `runVerbose()` calls
- Gracefully handles non-git-repo case (skips commit verification)

### `tests/unit/git-commit-helpers.test.ts` (NEW)
- 11 tests covering all three new git functions:
  - `getHeadCommitHash`: normal, not-in-repo, empty output, whitespace trimming
  - `getHeadCommitMessage`: normal, not-in-repo, empty output
  - `isFileCommittedInHead`: file exists, file missing, not-in-repo, command failure

### `tests/unit/claude-runner.test.ts`
- Added mock for `git.js` module (`getHeadCommitHash`, `getHeadCommitMessage`, `isFileCommittedInHead`)
- Added 7 new tests in `commit verification during grace period` describe block:
  - Commit verified within initial grace period (kills normally)
  - Commit found during extended polling (extends, then kills)
  - Commit never lands (hard max at 180s)
  - FAILED markers don't trigger commit verification
  - Backward compatible without commitContext
  - Verifies commit message prefix must match
  - Verifies outcome file must be committed

## Acceptance Criteria
- [x] HEAD hash is recorded before each task execution
- [x] Grace period checks for commit matching `RAF[project:task]` pattern
- [x] Grace period checks that outcome file is committed
- [x] Grace period extends up to 180 seconds if commit not found
- [x] Process is killed with a warning after 180 seconds if commit never lands
- [x] Normal flow (commit lands within 60s) is not affected
- [x] All existing tests pass (805 pass, 1 pre-existing failure in planning-prompt.test.ts is unrelated)
- [x] New tests cover: commit found within grace, commit found in extended grace, commit never found (hard timeout)

<promise>COMPLETE</promise>
