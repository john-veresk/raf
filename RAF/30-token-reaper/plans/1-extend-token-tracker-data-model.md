# Task: Extend TokenTracker to store per-attempt usage data

## Objective
Refactor TokenTracker to accept and store an array of per-attempt UsageData entries per task, instead of a single UsageData.

## Context
Currently TokenTracker stores one `UsageData` per task via `addTask(taskId, usage)`. When a task retries, only the last attempt's data reaches the tracker. To fix underreporting, the tracker needs to accept multiple attempt entries per task and compute totals from all of them.

## Requirements
- Change `TaskUsageEntry` to hold an array of attempt `UsageData` entries alongside the aggregated totals
- Update `addTask()` to accept an array of `UsageData` (one per attempt) instead of a single `UsageData`
- The per-entry `usage` field should be the sum of all attempts (for backward compatibility with `getTotals()`)
- The per-entry `cost` field should be the sum of all attempts' costs
- Store the raw per-attempt data so formatting functions can display breakdowns
- `getTotals()` should continue to work correctly — it already sums across entries, so as long as each entry's `usage` is the accumulated total, no changes needed there
- Add a helper method or utility to merge/accumulate multiple `UsageData` objects into one
- Maintain backward compatibility: if only one attempt occurred, behavior is identical to today
- Cover changes with unit tests

## Implementation Steps
1. Add an `attempts` field to `TaskUsageEntry` that stores the array of individual `UsageData` objects
2. Create an `accumulateUsage()` utility that merges multiple `UsageData` into a single combined `UsageData` (summing all token fields and merging `modelUsage` maps)
3. Update `addTask()` signature to accept `UsageData[]` — it calls `accumulateUsage()` to compute the combined `usage` and `calculateCost()` on the combined result
4. Update existing tests and add new tests for multi-attempt accumulation

## Acceptance Criteria
- [ ] `TaskUsageEntry` has an `attempts: UsageData[]` field
- [ ] `addTask()` accepts an array and correctly accumulates tokens across attempts
- [ ] `accumulateUsage()` correctly sums all token fields including per-model breakdowns
- [ ] `getTotals()` returns correct grand totals when tasks have multiple attempts
- [ ] Single-attempt tasks behave identically to before
- [ ] All existing and new tests pass

## Notes
- The `accumulateUsage()` helper should handle merging `modelUsage` maps where different attempts may use different models (e.g., attempt 1 uses Opus, retry uses Sonnet via fallback)
- Keep `calculateCost()` unchanged — it operates on a single `UsageData` which is the accumulated total
