# Outcome: Update Task Status Display Format

## Summary

Changed the task status display format from `[ID] name` to `ID-name` to match the file naming convention used in plan/outcome files.

## Key Changes

- **`src/utils/terminal-symbols.ts`** (line 52): Changed `idPrefix` from `` `[${taskId}] ` `` to `` `${taskId}-` ``
- **`src/utils/terminal-symbols.ts`** (lines 39-40): Updated JSDoc `@param` and `@returns` to reflect the new format
- **`tests/unit/terminal-symbols.test.ts`**: Updated 4 test expectations to match the new format:
  - `● 001-auth-login 1/5` (was `● [001] auth-login 1/5`)
  - `✓ 001-auth-login 1m 23s` (was `✓ [001] auth-login 1m 23s`)
  - `⊘ 002-depends-on-failed 2/5` (was `⊘ [002] depends-on-failed 2/5`)
  - `✗ 003-deploy 45s` (was `✗ [003] deploy 45s`)

## Test Results

All 933 tests pass (45 suites).

<promise>COMPLETE</promise>
