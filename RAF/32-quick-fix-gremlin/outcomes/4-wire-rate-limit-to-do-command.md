# Outcome: Wire rate-limit estimate display config to do command

## Summary
Successfully wired the `display.showRateLimitEstimate` and `display.showCacheTokens` config settings through to the token summary formatters in the `raf do` command. The rate limit percentage feature is now fully functional and respects user configuration.

## Changes Made

### 1. Updated `src/commands/do.ts`

**Import config helpers** (line 16):
- Added `getShowRateLimitEstimate` and `getShowCacheTokens` to imports from `../utils/config.js`

**Per-task token display - success path** (lines 1217-1225):
- Changed from calling `formatTaskTokenSummary(entry, calculateCost)` without options
- To calling with full options object containing:
  - `showCacheTokens: getShowCacheTokens()`
  - `showRateLimitEstimate: getShowRateLimitEstimate()`
  - `rateLimitPercentage: tokenTracker.getCumulativeRateLimitPercentage()`

**Per-task token display - failure path** (lines 1245-1253):
- Applied identical changes to the failed-task code path
- Ensures rate limit percentage is shown even for failed tasks with partial usage data

**Grand total summary** (lines 1356-1365):
- Changed from calling `formatTokenTotalSummary(usage, cost)` without options
- To calling with full options object containing the same config values
- Uses `tokenTracker.getCumulativeRateLimitPercentage()` to get the final cumulative percentage

### 2. Updated `src/utils/terminal-symbols.ts`

**Function `formatTokenLine`** (line 180):
- Changed default: `showRateLimitEstimate = false` → `showRateLimitEstimate = true`
- Now matches the config default (`display.showRateLimitEstimate: true`)

**Function `formatTokenTotalSummary`** (line 258):
- Changed default: `showRateLimitEstimate = false` → `showRateLimitEstimate = true`
- Ensures consistent default behavior across both formatter functions

## Key Improvements

1. **Feature is now live**: Previously dead code due to hardcoded `false` defaults
2. **Config-driven**: Both `display.showRateLimitEstimate` and `display.showCacheTokens` are properly wired through
3. **Cumulative tracking**: Each task shows the cumulative rate limit percentage up to that point
4. **Grand total**: Final summary shows the total cumulative percentage across all tasks
5. **User control**: Users can disable via `display.showRateLimitEstimate: false` in config

## Testing

- All 1273 tests pass (including 76 terminal-symbols tests)
- TypeScript compilation successful with no errors
- No test changes required (existing tests already covered the functionality)

## Acceptance Criteria

- ✅ Per-task token summaries show rate limit percentage when `display.showRateLimitEstimate` is `true`
- ✅ Grand total summary shows rate limit percentage
- ✅ Setting `display.showRateLimitEstimate: false` in config suppresses the display
- ✅ `display.showCacheTokens` config is also wired through
- ✅ Tests pass

<promise>COMPLETE</promise>
