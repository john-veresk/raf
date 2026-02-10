# Outcome: Fix Name Generation to Not Register Sessions

## Summary

Replaced `execSync` with `spawn` in name generation and added `--no-session-persistence` flag to prevent throwaway name generation calls from cluttering the user's Claude session history.

## Changes Made

### `src/utils/name-generator.ts`
- Replaced `import { execSync }` with `import { spawn }` from `node:child_process`
- Added `runClaudePrint()` helper function that uses `spawn` with `--no-session-persistence` and `-p` flags
- Simplified `callSonnetForName()` and `callSonnetForMultipleNames()` to use `runClaudePrint()`
- Removed `escapeShellArg()` function (no longer needed - spawn passes args as array, not shell string)
- Removed `escapeShellArg` from exports
- Kept same 30-second timeout behavior
- Kept same fallback behavior on failure (returns null for single name, empty array for multiple)

### `tests/unit/name-generator.test.ts`
- Replaced `execSync` mock with `spawn` mock using EventEmitter-based fake ChildProcess
- Added `createMockSpawn()` helper to create mock spawn return values
- Added test for `--no-session-persistence` flag presence
- Added test for spawn `error` event handling (e.g., ENOENT)
- Removed `escapeShellArg` tests (function removed)
- Updated model expectation from `sonnet` to `haiku` (actual default for nameGeneration)
- All 29 tests pass

## Verification

- TypeScript build passes cleanly
- All 29 name-generator tests pass
- Full test suite: 1065 passed, 1 failed (pre-existing, unrelated to this change)

<promise>COMPLETE</promise>
