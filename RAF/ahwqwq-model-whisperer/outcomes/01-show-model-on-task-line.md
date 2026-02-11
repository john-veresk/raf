# Task 01 - Show execution model on task line

## Summary

Successfully implemented displaying the execution model name in parentheses on all task progress lines. The model appears as a short alias (sonnet, opus, haiku) between the task name and the timer/counter.

## Key Changes Made

### 1. Updated `formatTaskProgress` function (`src/utils/terminal-symbols.ts:54-73`)
- Added optional `model?: string` parameter (7th parameter)
- Added `modelSuffix` that adds ` (${model})` when model is provided
- Model appears after task name, before timer/counter in both time and non-time formats
- Fully backwards compatible - existing calls without model parameter work unchanged

### 2. Updated `do.ts` to pass model to progress formatter (`src/commands/do.ts`)
- Added `currentModel` variable (line ~1027) to track the resolved model across retry attempts
- Updated timer callback (line ~1037) to pass model short name using `getModelShortName(currentModel)`
- Updated model inside retry loop (line ~1062) after model resolution
- Updated completed task line (line ~1235) to show model
- Updated failed task line (line ~1268) to show model
- Blocked tasks (line ~970) intentionally omit model since it's not resolved yet

### 3. Added comprehensive tests (`tests/unit/terminal-symbols.test.ts`)
- Added 13 new test cases covering:
  - Model display with/without time for all task states
  - Model display with task ID prefix
  - Model display combined with other parameters
  - Backwards compatibility (no model = no display)

## Implementation Details

- Uses `getModelShortName()` from `src/utils/config.ts` to convert full model IDs to short aliases
- Model is tracked in `currentModel` variable and updated on each retry attempt
- Timer callback captures `currentModel` in its closure, ensuring real-time updates
- Format examples:
  - `● 01-auth-login (sonnet) 1m 23s` (running with time)
  - `✓ 02-setup-db (opus) 2/5` (completed without time)
  - `✗ 03-deploy (haiku) 45s` (failed with time)
  - `⊘ 04-depends-on-failed 4/5` (blocked, no model shown)

## Test Results

All tests pass:
- 87 tests total in terminal-symbols.test.ts
- All existing tests continue to pass (backwards compatible)
- 13 new tests added for model display feature
- TypeScript build succeeds with no errors

<promise>COMPLETE</promise>
