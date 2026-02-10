# Task: Update token summary formatting to show per-attempt breakdowns

## Objective
Update `formatTaskTokenSummary()` to display a per-attempt breakdown when a task took multiple attempts, while keeping single-attempt output unchanged.

## Context
With tasks 01 and 02 complete, the `TaskUsageEntry` now contains an `attempts` array with per-attempt `UsageData`. The formatting function needs to render this breakdown so users can see token consumption per retry attempt.

## Dependencies
01, 02

## Requirements
- When a task has only 1 attempt, output is identical to the current format (no visual change)
- When a task has multiple attempts, show each attempt's tokens and cost on its own line, followed by a total line
- Always show the breakdown (not gated by --verbose flag)
- The grand total summary (`formatTokenTotalSummary`) remains unchanged — it shows combined totals only
- Update `formatTaskTokenSummary()` signature to accept the `attempts` array from `TaskUsageEntry`
- Cover changes with unit tests

## Implementation Steps
1. Update `formatTaskTokenSummary()` to accept the full `TaskUsageEntry` (or at minimum `usage`, `cost`, and `attempts`)
2. For single-attempt tasks (array length 1), render the existing format unchanged
3. For multi-attempt tasks, render each attempt on its own indented line with attempt number, tokens, and cost, then a total line
4. Update all call sites that invoke `formatTaskTokenSummary()` to pass the attempts data
5. Add tests for both single-attempt and multi-attempt formatting

## Acceptance Criteria
- [ ] Single-attempt tasks display identically to current format
- [ ] Multi-attempt tasks show per-attempt lines plus a total
- [ ] Formatting is clean and readable in terminal output
- [ ] `formatTokenTotalSummary()` is unchanged
- [ ] All call sites updated
- [ ] All tests pass

## Notes
- Example multi-attempt output (approximate):
  ```
    Attempt 1: 1,234 in / 567 out | Est. cost: $0.02
    Attempt 2: 2,345 in / 890 out | Est. cost: $0.04
    Total: 3,579 in / 1,457 out | Est. cost: $0.06
  ```
- Keep the dim styling consistent with existing token output
- The TokenTracker's `calculateCost()` can be used to get per-attempt costs if needed
