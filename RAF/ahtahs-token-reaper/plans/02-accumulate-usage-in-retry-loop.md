# Task: Accumulate usage data across retry attempts in the retry loop

## Objective
Change the retry loop in `do.ts` to collect usage data from every attempt instead of overwriting it, and pass the full array to TokenTracker.

## Context
The retry loop in `src/commands/do.ts` (around line 908-1021) currently declares a single `lastUsageData` variable that gets overwritten on each retry attempt. After the loop, only the final attempt's data is passed to `tokenTracker.addTask()`. This must change to collect all attempts' data.

## Dependencies
01

## Requirements
- Replace the single `lastUsageData` variable with an array that collects `UsageData` from each attempt
- Push each attempt's `usageData` into the array (when present) instead of overwriting
- After the retry loop, pass the full array to `tokenTracker.addTask()` (using the new signature from task 01)
- Both success and failure paths (lines ~1090 and ~1117) should pass the array
- Handle edge case: some attempts may not produce `usageData` (timeout, crash) — skip those entries
- Cover changes with tests

## Implementation Steps
1. Replace `let lastUsageData: UsageData | undefined` with `const attemptUsageData: UsageData[] = []`
2. Inside the retry loop, change the overwrite (`lastUsageData = result.usageData`) to a push (`attemptUsageData.push(result.usageData)`) when `result.usageData` is defined
3. Update the success path: call `tokenTracker.addTask(task.id, attemptUsageData)` when the array is non-empty
4. Update the failure path: same change
5. Add/update tests to verify accumulation across retries

## Acceptance Criteria
- [ ] Usage data from all retry attempts is collected in an array
- [ ] The full array is passed to `tokenTracker.addTask()`
- [ ] Attempts with no usage data (timeout/crash) are excluded from the array
- [ ] Single-attempt tasks still work correctly (array of length 1)
- [ ] All tests pass

## Notes
- The variable `lastOutput` should remain as-is (overwritten each attempt) since only the final output matters for result parsing
- Look at the `result.output` fallback path (line 971-974) — the old code had a fallback where `lastUsageData = result.output` which seems like a type issue; clean this up if it's not needed
