# Task 01: Extend TokenTracker Data Model

## Summary

Refactored TokenTracker to accept and store per-attempt UsageData entries per task, enabling accurate token tracking across retries.

## Changes Made

### src/utils/token-tracker.ts
- Added `attempts: UsageData[]` field to `TaskUsageEntry` interface
- Created `accumulateUsage()` utility function that merges multiple UsageData objects into one, summing all token fields and merging modelUsage maps (handles different models across attempts)
- Updated `addTask()` signature to accept `UsageData[]` instead of single `UsageData`
- `addTask()` now calls `accumulateUsage()` to compute combined usage and stores raw attempts for future display breakdowns

### src/commands/do.ts
- Updated two call sites to wrap single `lastUsageData` in array `[lastUsageData]`
- Added TODO comments indicating these should pass all attempt data once retry loop accumulates them

### tests/unit/token-tracker.test.ts
- Updated all existing test calls to use array syntax `[usage]`
- Added new tests for:
  - `accumulateUsage()` function (empty array, single element, multi-element, multi-model merging, non-mutation)
  - Multi-attempt accumulation in `addTask()`
  - Cost calculation for multi-model retry scenarios
  - `attempts` array storage in entries

## Acceptance Criteria Verification

- [x] `TaskUsageEntry` has an `attempts: UsageData[]` field
- [x] `addTask()` accepts an array and correctly accumulates tokens across attempts
- [x] `accumulateUsage()` correctly sums all token fields including per-model breakdowns
- [x] `getTotals()` returns correct grand totals when tasks have multiple attempts
- [x] Single-attempt tasks behave identically to before
- [x] All existing and new token-tracker tests pass (27 tests)

## Notes

- The `accumulateUsage()` function handles the case where different attempts use different models (e.g., Opus on first attempt, Sonnet on retry due to fallback)
- `calculateCost()` was left unchanged as designed - it operates on the accumulated UsageData
- Pre-existing test failures in validation.test.ts and claude-runner-interactive.test.ts are unrelated to this task

<promise>COMPLETE</promise>
