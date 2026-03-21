# Outcome: Fix Mixed-Attempt Cost Underreporting

## Summary
Fixed the cost calculation in `TokenTracker.addTask()` to compute cost per-attempt rather than on merged/accumulated usage data. This prevents underreporting when task attempts have mixed `modelUsage` presence (some with per-model breakdown, others with only aggregate fields).

## Key Changes

### `src/utils/token-tracker.ts`

1. **Added `sumCostBreakdowns()` helper function** (lines 27-45)
   - Sums multiple `CostBreakdown` objects into a single total
   - Sums all cost fields: `inputCost`, `outputCost`, `cacheReadCost`, `cacheCreateCost`, `totalCost`

2. **Modified `addTask()` method** (lines 101-110)
   - Now calculates cost per-attempt using `this.calculateCost()` on each individual `UsageData`
   - Sums per-attempt costs using `sumCostBreakdowns()`
   - This ensures attempts with empty `modelUsage` correctly fall back to sonnet pricing independently, rather than being silently dropped when merged with attempts that have `modelUsage`

### `tests/unit/token-tracker.test.ts`

Added new test suites:

1. **`describe('mixed-attempt cost calculation (aggregate + modelUsage)')`** - 4 tests:
   - `should correctly price attempts with mixed modelUsage presence` - Core mixed-attempt scenario
   - `should not underreport cost when first attempt has no modelUsage` - Order independence
   - `should handle all aggregate-only attempts` - Both attempts use sonnet fallback
   - `should include cache costs from aggregate-only attempts` - Cache token handling

2. **`describe('sumCostBreakdowns')`** - 3 tests:
   - `should return zero breakdown for empty array`
   - `should return same breakdown for single element`
   - `should sum all cost fields across breakdowns`

## Acceptance Criteria Verification
- [x] Cost is calculated per-attempt, not on merged usage
- [x] Mixed attempts (some with modelUsage, some without) report accurate total cost
- [x] Per-attempt display in multi-attempt summaries shows correct individual costs (unchanged - `formatTaskTokenSummary` already uses `calculateAttemptCost` callback)
- [x] Grand total cost across all tasks remains accurate (entry costs are summed in `getTotals()`)
- [x] New test cases cover the mixed-attempt edge case
- [x] Existing token tracking tests still pass (34 tests pass)

## Notes
- The pre-existing test failures in `claude-runner-interactive.test.ts` and `validation.test.ts` are unrelated to this change - they concern model resolution expecting short aliases but receiving full model IDs
- Token count accumulation (`accumulateUsage()`) remains unchanged - only cost calculation was modified

<promise>COMPLETE</promise>
