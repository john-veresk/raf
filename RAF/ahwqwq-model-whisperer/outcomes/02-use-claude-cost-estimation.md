# Task 02 - Use Claude's native cost estimation instead of local calculations

## Summary

Successfully replaced RAF's local token pricing and cost calculation infrastructure with Claude CLI's native `total_cost_usd` and per-model `costUSD` values from stream-json result events. This eliminates the need to maintain pricing tables and ensures accuracy as Anthropic adjusts pricing.

## Key Changes Made

### 1. Updated Type Definitions (`src/types/config.ts`)
- Added `totalCostUsd: number` field to `UsageData` interface
- Added `costUsd: number` field to `ModelTokenUsage` interface
- Removed `PricingCategory`, `ModelPricing`, `PricingConfig` types
- Removed `RateLimitWindowConfig` interface
- Removed `pricing` and `rateLimitWindow` from `RafConfig` interface
- Removed `showRateLimitEstimate` from `DisplayConfig` interface
- Updated `DEFAULT_CONFIG` to remove pricing and rate limit sections

### 2. Updated Stream Event Parser (`src/parsers/stream-renderer.ts`)
- Added `total_cost_usd?: number` field to `StreamEvent` interface
- Added `costUSD?: number` field to modelUsage entries in `StreamEvent`
- Updated `extractUsageData()` to extract `total_cost_usd` from result events
- Updated `extractUsageData()` to extract `costUSD` from each modelUsage entry
- Map extracted values to `UsageData.totalCostUsd` and `ModelTokenUsage.costUsd`

### 3. Simplified TokenTracker (`src/utils/token-tracker.ts`)
- Removed `PricingConfig` constructor parameter
- Removed `calculateCost()` method entirely
- Removed `calculateRateLimitPercentage()` and `getCumulativeRateLimitPercentage()` methods
- Simplified `CostBreakdown` interface to just `{ totalCost: number }`
- Updated `addTask()` to sum `totalCostUsd` from attempts
- Updated `getTotals()` to accumulate costs directly from entries
- Updated `accumulateUsage()` to merge `costUsd` and sum `totalCostUsd`
- Updated `sumCostBreakdowns()` to simply sum `totalCost` values

### 4. Removed Config Infrastructure (`src/utils/config.ts`)
- Removed `PricingCategory`, `ModelPricing`, `PricingConfig`, `RateLimitWindowConfig` imports
- Removed `pricing` and `rateLimitWindow` from `VALID_TOP_LEVEL_KEYS`
- Removed pricing and rate limit validation sections from `validateConfig()`
- Removed `showRateLimitEstimate` from `VALID_DISPLAY_KEYS`
- Removed pricing and rate limit deep-merge logic from `deepMerge()`
- Removed accessor functions: `resolveModelPricingCategory()`, `getPricing()`, `getPricingConfig()`, `getRateLimitWindowConfig()`, `getShowRateLimitEstimate()`, `getSonnetTokenCap()`

### 5. Updated Display Formatting (`src/utils/terminal-symbols.ts`)
- Removed `showRateLimitEstimate` and `rateLimitPercentage` from `TokenSummaryOptions`
- Removed `formatRateLimitPercentage()` function
- Removed rate limit display from `formatTokenLine()`
- Updated `formatTaskTokenSummary()` signature to remove `calculateAttemptCost` parameter
- Updated `formatTaskTokenSummary()` to read `totalCostUsd` directly from attempts
- Changed "Est. cost" label to "Cost" in `formatTokenLine()`
- Changed "Estimated cost" to "Total cost" in `formatTokenTotalSummary()`
- Removed rate limit display from `formatTokenTotalSummary()`

### 6. Updated do.ts (`src/commands/do.ts`)
- Removed `getShowRateLimitEstimate` import
- Removed `TokenTracker` pricing constructor argument
- Removed `getCumulativeRateLimitPercentage()` calls
- Removed `calculateCost` callback from `formatTaskTokenSummary()` calls
- Simplified token summary display to only pass `showCacheTokens` option

### 7. Updated Documentation (`src/prompts/config-docs.md`)
- Removed entire `pricing` section
- Removed entire `rateLimitWindow` section
- Removed `showRateLimitEstimate` from display options documentation
- Updated validation rules to remove pricing and rate limit references
- Updated full config example to remove pricing and rate limit fields

### 8. Updated CLAUDE.md
- Updated Token Usage Tracking section to reflect Claude-provided costs
- Changed "cost calculation uses configurable per-model pricing" to "Claude CLI provides exact costs via `total_cost_usd` and per-model `costUSD` fields"
- Changed "estimated cost" references to "cost"

### 9. Updated All Tests
- **config.test.ts**: Removed pricing and rate limit validation tests, removed `resolveModelPricingCategory` tests, updated display config tests
- **terminal-symbols.test.ts**: Removed `formatRateLimitPercentage` tests, updated cost display expectations to "Cost:" instead of "Est. cost:", updated multi-attempt tests to use `totalCostUsd`
- **token-tracker.test.ts**: Complete rewrite to test simplified TokenTracker using Claude-provided costs
- **stream-renderer.test.ts**: Added tests for `total_cost_usd` and `costUSD` extraction
- **config-command.test.ts**: Updated nested key tests to use `showCacheTokens` instead of pricing/rate limit fields
- **claude-runner.test.ts**: Added `costUsd: 0` to modelUsage expectations

## Test Results

All tests pass: **1251 tests passed** (50 test suites)

## Verification

All acceptance criteria met:
- ✅ `total_cost_usd` extracted from stream-json result events
- ✅ Per-model `costUSD` extracted from modelUsage
- ✅ `TokenTracker` accumulates costs from Claude data (no local calculation)
- ✅ `pricing.*` config keys removed from types, defaults, validation, and docs
- ✅ `rateLimitWindow` config removed entirely
- ✅ `showRateLimitEstimate` display option removed
- ✅ Rate limit percentage display removed from all summaries
- ✅ `resolveModelPricingCategory()` and related functions removed
- ✅ Token counts (in/out/cache) still tracked and displayed
- ✅ Cost display shows "Cost:" instead of "Est. cost:"
- ✅ Config validation rejects `pricing` and `rateLimitWindow` as unknown keys
- ✅ All tests updated and passing

## Notes

- The change from "Est. cost" to "Cost" reflects that we now display exact costs from Claude rather than estimates
- Config validation now properly rejects `pricing` and `rateLimitWindow` keys as unknown, preventing users from trying to configure these removed features
- Token tracking infrastructure remains intact - only cost calculation changed
- Defensive handling: if Claude doesn't provide cost data, `totalCostUsd` and `costUsd` default to 0

<promise>COMPLETE</promise>
