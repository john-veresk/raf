# Task 02: Accumulate Usage in Retry Loop

## Summary

Modified the retry loop in `do.ts` to collect usage data from every attempt instead of overwriting it, and pass the full array to TokenTracker for accurate token tracking across retries.

## Changes Made

### src/commands/do.ts
- Replaced `let lastUsageData: UsageData | undefined` with `const attemptUsageData: UsageData[] = []`
- Changed from overwriting `lastUsageData = result.usageData` to `attemptUsageData.push(result.usageData)` when usage data is present
- Updated success path (lines ~1091-1095): now checks `attemptUsageData.length > 0` and passes the full array to `tokenTracker.addTask()`
- Updated failure path (lines ~1118-1122): same change, passes full array for partial data tracking
- Removed TODO comments that were added in Task 01 as placeholders

## Acceptance Criteria Verification

- [x] Usage data from all retry attempts is collected in an array
- [x] The full array is passed to `tokenTracker.addTask()`
- [x] Attempts with no usage data (timeout/crash) are excluded from the array (only push when `result.usageData` is defined)
- [x] Single-attempt tasks still work correctly (array of length 1)
- [x] All tests pass (token-tracker: 27 tests, do-*: 44 tests)

## Notes

- The `lastOutput` variable remains unchanged as designed - only final output matters for result parsing
- The existing tests from Task 01 already cover the accumulation logic in `TokenTracker` and `accumulateUsage()`
- The change is minimal and surgical - only the usage data collection mechanism was updated
- Edge cases (timeouts, crashes, context overflow) correctly result in no usage data being pushed for that attempt

<promise>COMPLETE</promise>
