# Outcome: Remove details and failure history from successful outcomes

## Summary

Successfully implemented the behavior change to clean up successful task outcomes while preserving debugging information in failed outcomes.

## Changes Made

### 1. Modified `src/commands/do.ts`

- **Renamed `formatFailureHistory` to `formatRetryHistoryForConsole`**: The function now formats retry history for console output instead of markdown files
- **Added `TaskRetryHistory` interface**: Tracks retry information per task (taskId, taskName, failureHistory, finalAttempt, success)
- **Added `projectRetryHistory` array**: Collects retry information during task execution for all tasks that had failures
- **Removed `## Details` section from successful outcomes**: Claude-written outcomes are now preserved as-is without appending metadata
- **Removed `## Failure History` from all outcome files**: No longer inserted into outcome files for either success or failure
- **Kept `## Details` section for failed outcomes**: Still includes attempts, elapsed time, timestamp, and stash name for debugging
- **Added retry history console output**: At the end of project execution, shows retry history for any task that had failures

### 2. Updated `tests/unit/outcome-content.test.ts`

- Rewrote tests to verify new behavior
- Added tests for successful outcomes having no `## Details` or `## Failure History`
- Added tests for failed outcomes keeping `## Details` section
- Added tests for `formatRetryHistoryForConsole` function

### 3. Updated `tests/unit/failure-history.test.ts`

- Updated to test the renamed `formatRetryHistoryForConsole` function
- Updated test expectations to match the new console output format
- Tests verify proper indentation, task name formatting, and attempt tracking

## Acceptance Criteria Verification

- [x] Successful task outcomes do not contain `## Details` section
- [x] Successful task outcomes do not contain `## Failure History` section
- [x] Failed task outcomes still contain `## Details` section with all metadata
- [x] Console output shows retry history for any task that had failures before completing
- [x] All existing tests pass (725 tests)
- [x] New/updated tests verify the behavior change

## Console Output Format

When tasks have retries, the output at the end of execution looks like:

```
Retry history:
  Task 001 (my-task):
    Attempt 1: Failed - Connection timeout
    Attempt 2: Succeeded
```

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 5m 27s
- Completed at: 2026-01-31T17:16:19.006Z
