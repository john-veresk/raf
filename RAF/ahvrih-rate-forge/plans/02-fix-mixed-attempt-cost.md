# Task: Fix Mixed-Attempt Cost Underreporting

## Objective
Fix cost calculation to compute cost per-attempt rather than on accumulated usage, preventing underreporting when attempts have mixed aggregate-only and per-model usage data.

## Context
`TokenTracker.addTask()` currently calls `accumulateUsage(attempts)` to merge all attempts into one `UsageData`, then calls `calculateCost()` on the merged result. The problem: if some attempts have `modelUsage` populated and others only have aggregate fields (which `extractUsageData` allows), the merged result has a non-empty `modelUsage` map. `calculateCost()` then takes the per-model branch and only prices tokens in `modelUsage`, silently dropping aggregate-only tokens from attempts that lacked `modelUsage`. This means mixed-attempt retries underreport cost.

## Requirements
- Calculate cost independently for each attempt's `UsageData`
- Each attempt uses per-model pricing if it has `modelUsage`, or aggregate-fallback (Sonnet rates) if it doesn't
- Sum the per-attempt costs to get the task total
- The per-attempt cost calculation should also be available for the display formatter (it already receives a `calculateAttemptCost` callback)
- Preserve the accumulated usage totals for token count display (input/output/cache totals should still be summed across attempts)

## Implementation Steps
1. Modify `addTask()` in `TokenTracker` to calculate cost per-attempt, then sum into the task's `CostBreakdown`
2. Ensure `calculateCost()` is called on individual attempt `UsageData` objects, not on the accumulated merge
3. Update the `CostBreakdown` aggregation to sum per-attempt breakdowns
4. Verify that `formatTaskTokenSummary()` still works correctly — it receives per-attempt cost via callback, so the callback should use single-attempt `calculateCost()`
5. Add test cases covering the mixed-attempt scenario: one attempt with `modelUsage`, another with only aggregate fields

## Acceptance Criteria
- [ ] Cost is calculated per-attempt, not on merged usage
- [ ] Mixed attempts (some with modelUsage, some without) report accurate total cost
- [ ] Per-attempt display in multi-attempt summaries shows correct individual costs
- [ ] Grand total cost across all tasks remains accurate
- [ ] New test cases cover the mixed-attempt edge case
- [ ] Existing token tracking tests still pass

## Notes
- The key insight: `accumulateUsage()` is fine for summing token counts for display, but cost calculation must happen before merging to respect the per-model vs. aggregate distinction per attempt.
- The `formatTaskTokenSummary` already accepts a `calculateAttemptCost` callback — this callback should call `calculateCost` on individual attempt data, which is already the correct granularity.
