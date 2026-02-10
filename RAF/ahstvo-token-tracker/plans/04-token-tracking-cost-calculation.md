# Task: Add Token Tracking and Cost Calculation

## Objective
Implement token usage accumulation across tasks and cost calculation using configurable per-model pricing.

## Context
After task execution is unified to stream-json (task 03), each task returns `UsageData` with token counts. This task adds the infrastructure to accumulate usage across multiple tasks and calculate estimated costs based on configurable pricing.

## Dependencies
01, 03

## Requirements
- Add pricing config to the RAF config schema with current prices as defaults
- Pricing is per-model, per-direction (input vs output), in dollars per million tokens
- Support pricing tiers: standard (prompts <= 200K tokens) and extended (prompts > 200K tokens) for Opus and Sonnet; flat rate for Haiku
- Cache read tokens should use a discounted price (typically 90% off input price — check Claude pricing page)
- Cache creation tokens should use standard input price
- Accumulate usage data across all tasks in a project execution run
- Calculate estimated cost from token counts × configurable prices

## Implementation Steps
1. Define pricing types and add pricing config to the config schema in `src/types/config.ts` with default values:
   - Opus: $15/MTok input, $75/MTok output (standard tier)
   - Sonnet: $3/MTok input, $15/MTok output
   - Haiku: $1/MTok input, $5/MTok output
   - Cache read discount: 90% off input price
   - Cache creation: same as input price
2. Add config validation for pricing fields in `src/utils/config.ts`
3. Add pricing accessor helpers (e.g., `getPricing(model)`)
4. Create a `TokenTracker` utility (e.g., `src/utils/token-tracker.ts`) that:
   - Accepts `UsageData` from each task execution
   - Accumulates totals (input, output, cache read, cache creation tokens per model)
   - Calculates cost from token counts × configured prices
   - Provides per-task summaries and a grand total
5. Map model IDs from CLI output (e.g., `claude-opus-4-6`) to pricing tiers — the modelUsage keys are full model IDs, so need a mapping from full ID to pricing category (opus/sonnet/haiku)
6. Update config docs in `src/prompts/config-docs.md`
7. Add tests for cost calculation and token accumulation

## Acceptance Criteria
- [ ] Pricing config added with sensible defaults matching current Claude API pricing
- [ ] `TokenTracker` accumulates usage across multiple tasks correctly
- [ ] Cost calculation is accurate: `tokens × price_per_token` for each category
- [ ] Per-model pricing works (different costs for opus vs sonnet vs haiku)
- [ ] Cache tokens use discounted pricing
- [ ] Config validation accepts valid pricing, rejects invalid
- [ ] All tests pass

## Notes
- Current pricing (as of 2026-02-10):
  - Opus 4.6: $15/MTok input, $75/MTok output (standard ≤200K context)
  - Sonnet 4.5: $3/MTok input, $15/MTok output
  - Haiku 4.5: $1/MTok input, $5/MTok output
  - Cache read is typically 10% of input price
  - Cache creation is typically 25% more than input price
- Model ID mapping: `claude-opus-4-6` → opus pricing, `claude-sonnet-4-5-*` → sonnet pricing, etc. Use a pattern-based lookup
- Consider whether to track extended context pricing (>200K tokens) — may not be worth the complexity initially since RAF tasks rarely exceed 200K
