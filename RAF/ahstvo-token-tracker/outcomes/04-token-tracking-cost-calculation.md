# Outcome: Add Token Tracking and Cost Calculation

## Summary

Implemented token usage accumulation across tasks and cost calculation using configurable per-model pricing. Added pricing config to the RAF config schema, a `TokenTracker` utility class, and model ID to pricing category mapping.

## Changes Made

### `src/types/config.ts`
- Added `PricingCategory` type (`'opus' | 'sonnet' | 'haiku'`)
- Added `ModelPricing` interface (inputPerMTok, outputPerMTok, cacheReadPerMTok, cacheCreatePerMTok)
- Added `PricingConfig` interface (per-category pricing)
- Added `pricing` field to `RafConfig` interface
- Added default pricing to `DEFAULT_CONFIG`:
  - Opus: $15/$75 input/output, $1.50 cache read, $18.75 cache create
  - Sonnet: $3/$15 input/output, $0.30 cache read, $3.75 cache create
  - Haiku: $1/$5 input/output, $0.10 cache read, $1.25 cache create

### `src/utils/config.ts`
- Added `pricing` to `VALID_TOP_LEVEL_KEYS` and validation sets
- Added pricing validation in `validateConfig()`: validates categories, fields, and values
- Added pricing deep-merge in `deepMerge()` (per-category field-level merging)
- Added `resolveModelPricingCategory()`: maps full model IDs (e.g., `claude-opus-4-6`) and short aliases to pricing categories
- Added `getPricing(category)` and `getPricingConfig()` accessor helpers

### `src/utils/token-tracker.ts` (new file)
- `TokenTracker` class that accumulates `UsageData` across task executions
- `addTask(taskId, usage)`: records a task's usage and calculates per-task cost
- `getTotals()`: returns accumulated usage and cost across all tasks
- `calculateCost(usage)`: calculates cost using per-model pricing from `modelUsage` breakdown
- Falls back to sonnet pricing when model breakdown is unavailable or model family is unknown
- Exports `CostBreakdown` and `TaskUsageEntry` interfaces

### `src/prompts/config-docs.md`
- Added `pricing` section documenting all fields, defaults, and example override
- Updated validation rules to mention pricing constraints
- Updated "Full — All Settings Explicit" example to include pricing

### `tests/unit/token-tracker.test.ts` (new file)
- 14 tests covering: per-model cost calculation (opus/sonnet/haiku), multi-model usage, cache token pricing, fallback behavior, accumulation across tasks, custom pricing, zero tokens, per-task entries

### `tests/unit/config.test.ts`
- Added 10 pricing validation tests (valid, partial, invalid types, unknown keys, negative values, Infinity)
- Added 3 `resolveModelPricingCategory` tests (short aliases, full IDs, unknown families)
- Added 2 `resolveConfig` pricing tests (defaults, deep-merge partial override)

## Verification

- TypeScript build passes cleanly
- All 1103 tests pass (15 new tests added)
- 1 pre-existing test failure confirmed unrelated (same on base branch)

<promise>COMPLETE</promise>
