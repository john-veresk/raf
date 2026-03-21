---
effort: medium
---
# Task: Use Claude's native cost estimation instead of local calculations

## Objective
Replace RAF's local token pricing and cost calculation with Claude CLI's native `total_cost_usd` and per-model `costUSD` values from the stream-json result event.

## Context
RAF currently maintains its own pricing tables (`pricing.*` config) and calculates costs locally using per-model token counts. Claude CLI already provides accurate cost data in the result event: `total_cost_usd` (session total) and `modelUsage.<model>.costUSD` (per-model). Using Claude's native cost eliminates the need to maintain pricing tables and ensures accuracy as Anthropic adjusts pricing.

## Requirements
- Extract `total_cost_usd` from the stream-json result event
- Extract per-model `costUSD` from `modelUsage.<model>` entries
- Replace all local cost calculation with Claude-provided values
- Remove `pricing.*` config keys, `PricingConfig`/`ModelPricing` types, and all related code
- Remove `PricingCategory` type and `resolveModelPricingCategory()` function
- Keep token tracking (input/output/cache counts) — only cost calculation changes
- If Claude doesn't provide cost data (unlikely but defensive), show `$?.??` or similar

## Implementation Steps

1. **Update `UsageData` type** in `src/types/config.ts`:
   - Add `totalCostUsd: number` field
   - Add `costUsd` to `ModelTokenUsage` interface
   - Remove `PricingConfig`, `ModelPricing`, `PricingCategory` types

2. **Update `extractUsageData` in `src/parsers/stream-renderer.ts`**:
   - Extract `total_cost_usd` from the result event (top-level field)
   - Extract `costUSD` from each `modelUsage` entry
   - Map to `UsageData.totalCostUsd` and `ModelTokenUsage.costUsd`
   - Update `StreamEvent` interface to include `total_cost_usd?: number` and `costUSD` in modelUsage

3. **Simplify `TokenTracker` in `src/utils/token-tracker.ts`**:
   - Remove `PricingConfig` constructor parameter
   - Remove `calculateCost()` method entirely
   - Remove `calculateRateLimitPercentage()` and `getCumulativeRateLimitPercentage()` methods
   - Simplify `CostBreakdown` to just `{ totalCost: number }` (since we only get a single cost number from Claude)
   - In `addTask()`: sum `totalCostUsd` from attempts instead of calculating
   - In `getTotals()`: sum costs directly from entries

4. **Remove config infrastructure**:
   - Remove `pricing` from `RafConfig` interface and `DEFAULT_CONFIG` in `src/types/config.ts`
   - Remove `rateLimitWindow` from `RafConfig` and `DEFAULT_CONFIG`
   - Remove `showRateLimitEstimate` from `DisplayConfig`
   - Remove `RateLimitWindowConfig` interface
   - Remove from `VALID_TOP_LEVEL_KEYS` in `src/utils/config.ts`
   - Remove pricing validation in `validateConfig()`
   - Remove `rateLimitWindow` validation in `validateConfig()`
   - Remove `showRateLimitEstimate` from `VALID_DISPLAY_KEYS`
   - Remove accessor functions: `getPricing()`, `getPricingConfig()`, `getRateLimitWindowConfig()`, `getShowRateLimitEstimate()`, `getSonnetTokenCap()`, `resolveModelPricingCategory()`
   - Remove deep-merge logic for `pricing` and `rateLimitWindow` in `mergeConfigs()`

5. **Update display formatting** in `src/utils/terminal-symbols.ts`:
   - Remove `formatRateLimitPercentage()` function
   - Remove `showRateLimitEstimate` and `rateLimitPercentage` from `TokenSummaryOptions`
   - Remove rate limit display from `formatTokenLine()` and `formatTokenTotalSummary()`
   - Update `formatTaskTokenSummary()` — the `calculateAttemptCost` callback is no longer needed; instead read `totalCostUsd` directly from each attempt's `UsageData`
   - Change "Est. cost" label to "Cost" (since it's now exact)

6. **Update `do.ts` call sites** in `src/commands/do.ts`:
   - Remove `TokenTracker` pricing constructor arg
   - Remove `getCumulativeRateLimitPercentage()` calls
   - Remove `getShowRateLimitEstimate()` calls
   - Remove `calculateCost` callback from `formatTaskTokenSummary()` calls
   - Simplify token summary display calls

7. **Update config-docs.md** in `src/prompts/config-docs.md`:
   - Remove `pricing` section
   - Remove `rateLimitWindow` section
   - Remove `display.showRateLimitEstimate` documentation
   - Update the full config example

8. **Update tests**:
   - Rewrite `tests/unit/token-tracker.test.ts`: remove all pricing/cost calculation tests, add tests for cost accumulation from `UsageData.totalCostUsd`
   - Update `tests/unit/terminal-symbols.test.ts`: remove rate limit tests, update cost display tests
   - Update `tests/unit/stream-renderer.test.ts`: add tests for `total_cost_usd` and `costUSD` extraction
   - Update `tests/unit/config.test.ts`: remove pricing/rateLimitWindow validation tests

9. **Update CLAUDE.md**: Remove pricing-related architectural notes, update token tracking documentation

## Acceptance Criteria
- [ ] `total_cost_usd` extracted from stream-json result events
- [ ] Per-model `costUSD` extracted from modelUsage
- [ ] `TokenTracker` accumulates costs from Claude data (no local calculation)
- [ ] `pricing.*` config keys removed from types, defaults, validation, and docs
- [ ] `rateLimitWindow` config removed entirely
- [ ] `showRateLimitEstimate` display option removed
- [ ] Rate limit percentage display removed from all summaries
- [ ] `resolveModelPricingCategory()` and related functions removed
- [ ] Token counts (in/out/cache) still tracked and displayed
- [ ] Cost display shows "Cost:" instead of "Est. cost:"
- [ ] Config validation rejects `pricing` and `rateLimitWindow` as unknown keys
- [ ] All tests updated and passing

## Notes
- Claude CLI result event structure (verified):
  ```json
  {
    "type": "result",
    "total_cost_usd": 0.009946,
    "modelUsage": {
      "claude-haiku-4-5-20251001": {
        "inputTokens": 348,
        "outputTokens": 52,
        "cacheReadInputTokens": 18005,
        "cacheCreationInputTokens": 6030,
        "costUSD": 0.009946
      }
    }
  }
  ```
- The `total_cost_usd` and per-model `costUSD` appear in both `--output-format json` and `--output-format stream-json --verbose` result events
- `sumCostBreakdowns()` and `accumulateUsage()` helpers should be simplified or removed as needed
- For multi-attempt tasks, sum `totalCostUsd` across attempts
