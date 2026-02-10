# Outcome: Add Token/Cost Reporting to Console Output

## Summary

Wired token usage tracking into the `raf do` execution flow, displaying per-task token summaries after each task and a grand total summary after all tasks complete.

## Changes Made

### `src/utils/terminal-symbols.ts`
- Added `formatNumber()`: formats numbers with thousands separators (e.g., `12,345`)
- Added `formatCost()`: formats USD cost with 2-4 decimal places (2 for >= $0.01, 4 for smaller)
- Added `formatTaskTokenSummary()`: per-task summary line showing input/output tokens, cache tokens, estimated cost
- Added `formatTokenTotalSummary()`: grand total block with dividers, total tokens, cache breakdown, estimated cost
- Added imports for `UsageData` and `CostBreakdown` types

### `src/commands/do.ts`
- Imported `TokenTracker`, `formatTaskTokenSummary`, `formatTokenTotalSummary`
- Instantiated `TokenTracker` at the start of `executeSingleProject()`
- Added `lastUsageData` variable to capture usage from the last retry attempt
- After successful tasks: tracks usage and displays per-task summary via `logger.dim()`
- After failed tasks: tracks partial usage data and displays per-task summary
- After all tasks: displays grand total summary block if any tasks reported usage
- Tasks with no usage data (timeout, crash, no result event) are silently skipped

### `CLAUDE.md`
- Added "Token Usage Tracking" section documenting the feature, key files, and formatting utilities

### `tests/unit/terminal-symbols.test.ts`
- Added 20 new tests covering:
  - `formatNumber`: small numbers, thousands separators, large numbers, zero
  - `formatCost`: zero, normal costs, small costs, threshold boundary
  - `formatTaskTokenSummary`: no cache, cache read only, cache create only, both caches, small costs
  - `formatTokenTotalSummary`: no cache, cache read, cache create, both caches, divider lines

## Output Examples

Per-task (displayed in dim text after each task):
```
  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42
```

Grand total (displayed after all tasks):
```
── Token Usage Summary ──────────────────
Total tokens: 45,678 in / 12,345 out
Cache: 125,000 read / 8,000 created
Estimated cost: $3.75
─────────────────────────────────────────
```

## Verification

- TypeScript build passes cleanly
- All 1122 tests pass (20 new tests added)
- 1 pre-existing test failure confirmed unrelated (same on base branch)

<promise>COMPLETE</promise>
