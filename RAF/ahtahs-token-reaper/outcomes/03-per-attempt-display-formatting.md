# Task 03: Per-Attempt Display Formatting

## Summary

Updated `formatTaskTokenSummary()` to display a per-attempt breakdown when a task took multiple attempts, while keeping single-attempt output unchanged.

## Changes Made

### src/utils/terminal-symbols.ts
- Added import for `TaskUsageEntry` type from token-tracker
- Created internal `formatTokenLine()` helper function that formats a single line of token usage (used for both attempts and totals)
- Updated `formatTaskTokenSummary()` signature to accept:
  - `entry: TaskUsageEntry` (replaces separate `usage` and `cost` parameters)
  - `calculateAttemptCost?: (usage: UsageData) => CostBreakdown` (optional callback for per-attempt cost calculation)
- Single-attempt behavior: When `entry.attempts.length <= 1`, output is identical to previous format: `"  Tokens: X in / Y out | Cache: ... | Est. cost: $X.XX"`
- Multi-attempt behavior: Shows per-attempt breakdown with:
  - Each attempt on its own line: `"    Attempt N: X in / Y out | Cache: ... | Est. cost: $X.XX"`
  - Total line at the end: `"    Total: X in / Y out | Cache: ... | Est. cost: $X.XX"`

### src/commands/do.ts
- Updated both call sites (success and failure paths) to pass the full `TaskUsageEntry` and the `calculateCost` callback:
  - `logger.dim(formatTaskTokenSummary(entry, (u) => tokenTracker.calculateCost(u)))`

### tests/unit/terminal-symbols.test.ts
- Added import for `TaskUsageEntry` type
- Created `makeEntry()` helper to construct `TaskUsageEntry` objects for testing
- Reorganized `formatTaskTokenSummary` tests into two describe blocks:
  - `single-attempt tasks`: 6 tests verifying unchanged behavior for single-attempt scenarios
  - `multi-attempt tasks`: 4 tests covering multi-attempt formatting, cost calculation, cache tokens, and 3+ attempts

## Example Output

**Single-attempt (unchanged):**
```
  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42
```

**Multi-attempt (new):**
```
    Attempt 1: 1,234 in / 567 out | Est. cost: $0.02
    Attempt 2: 2,345 in / 890 out | Est. cost: $0.04
    Total: 3,579 in / 1,457 out | Est. cost: $0.06
```

## Acceptance Criteria Verification

- [x] Single-attempt tasks display identically to current format
- [x] Multi-attempt tasks show per-attempt lines plus a total
- [x] Formatting is clean and readable in terminal output
- [x] `formatTokenTotalSummary()` is unchanged
- [x] All call sites updated
- [x] All tests pass (135 tests including 10 new tests for this feature)

## Notes

- The `calculateAttemptCost` callback is optional; when not provided, per-attempt costs show `$0.00` (the total still shows accurate accumulated cost)
- Per-attempt lines use 4-space indent to visually nest under the task, while single-attempt uses 2-space indent
- Cache tokens are included in per-attempt breakdowns when present

<promise>COMPLETE</promise>
