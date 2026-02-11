effort: low
---
# Task: Wire rate-limit estimate display config to do command

## Objective
Pass the `display` config settings (`showRateLimitEstimate`, `showCacheTokens`) through to `formatTaskTokenSummary()` and `formatTokenTotalSummary()` calls in the do command.

## Context
PR #5 review comment: The formatter defaults `showRateLimitEstimate` to `false` in its destructuring, but `raf do` calls both formatters without passing `TokenSummaryOptions`. Despite `display.showRateLimitEstimate` defaulting to `true` in config, the feature is effectively dead code.

## Requirements
- Read display config settings and pass them as `TokenSummaryOptions` to both formatters
- Calculate and pass `rateLimitPercentage` from `TokenTracker`
- Per-task summaries should show cumulative rate limit percentage
- Grand total summary should show the final cumulative percentage

## Implementation Steps

1. **Edit `src/commands/do.ts`** — Build `TokenSummaryOptions` from config and pass to formatters.

   Near the top of `runDoCommand()` (after tokenTracker is created), import and read display config:
   ```typescript
   import { getShowRateLimitEstimate, getShowCacheTokens } from '../utils/config.js';
   ```

2. **Update per-task token display** (lines 1218-1220 and 1246-1248). Change both locations from:
   ```typescript
   logger.dim(formatTaskTokenSummary(entry, (u) => tokenTracker.calculateCost(u)));
   ```
   To:
   ```typescript
   const taskRateLimitPct = tokenTracker.getCumulativeRateLimitPercentage();
   logger.dim(formatTaskTokenSummary(entry, (u) => tokenTracker.calculateCost(u), {
     showCacheTokens: getShowCacheTokens(),
     showRateLimitEstimate: getShowRateLimitEstimate(),
     rateLimitPercentage: taskRateLimitPct,
   }));
   ```

3. **Update grand total display** (lines 1360-1361). Change from:
   ```typescript
   logger.dim(formatTokenTotalSummary(totals.usage, totals.cost));
   ```
   To:
   ```typescript
   const totalRateLimitPct = tokenTracker.getCumulativeRateLimitPercentage();
   logger.dim(formatTokenTotalSummary(totals.usage, totals.cost, {
     showCacheTokens: getShowCacheTokens(),
     showRateLimitEstimate: getShowRateLimitEstimate(),
     rateLimitPercentage: totalRateLimitPct,
   }));
   ```

4. **Update the default value** in `formatTokenTotalSummary` (line 258 of `terminal-symbols.ts`). Change:
   ```typescript
   const { showCacheTokens = true, showRateLimitEstimate = false, rateLimitPercentage } = options;
   ```
   To:
   ```typescript
   const { showCacheTokens = true, showRateLimitEstimate = true, rateLimitPercentage } = options;
   ```
   This makes the default behavior match the config default (`display.showRateLimitEstimate: true`), so any callers that don't pass options still get the feature.

   Also update `formatTokenLine` if it has a similar default for `showRateLimitEstimate`.

5. **Update tests** — Adjust any test expectations that rely on `showRateLimitEstimate` defaulting to `false`.

## Acceptance Criteria
- [ ] Per-task token summaries show rate limit percentage when `display.showRateLimitEstimate` is `true`
- [ ] Grand total summary shows rate limit percentage
- [ ] Setting `display.showRateLimitEstimate: false` in config suppresses the display
- [ ] `display.showCacheTokens` config is also wired through
- [ ] Tests pass

## Notes
- The `TokenTracker.getCumulativeRateLimitPercentage()` method already exists and works correctly
- The `getShowRateLimitEstimate()` and `getShowCacheTokens()` config helpers already exist in `src/utils/config.ts`
- All the pieces are in place — this task just wires them together
