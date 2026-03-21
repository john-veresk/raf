# Outcome: Remove Cache From Status Display

## Summary
Removed all cache token tracking (cacheReadInputTokens, cacheCreationInputTokens) and the display config (DisplayConfig, showCacheTokens) from the entire codebase. Token summaries now show only input/output tokens and cost.

## Changes Made

### Types (`src/types/config.ts`)
- Removed `cacheReadInputTokens` and `cacheCreationInputTokens` from `UsageData` and `ModelTokenUsage` interfaces
- Removed `DisplayConfig` interface and `display` field from `RafConfig` and `DEFAULT_CONFIG`

### Token Tracker (`src/utils/token-tracker.ts`)
- Removed all cache field references from `mergeUsageData()`, `accumulateUsage()`, and `getTotals()`

### Terminal Symbols (`src/utils/terminal-symbols.ts`)
- Removed `TokenSummaryOptions` interface
- Removed cache display block from `formatTokenLine()`
- Simplified `formatTaskTokenSummary()` and `formatTokenTotalSummary()` signatures (no options param)

### Stream Parsers
- `src/parsers/stream-renderer.ts`: Removed cache field extraction from API response parsing
- `src/parsers/codex-stream-renderer.ts`: Removed hardcoded cache zero fields

### Commands (`src/commands/do.ts`)
- Removed `getShowCacheTokens` import and all `showCacheTokens` option passing

### Config (`src/utils/config.ts`)
- Removed `DisplayConfig` import, `VALID_DISPLAY_KEYS`, display validation block, display merge logic
- Removed `getDisplayConfig()` and `getShowCacheTokens()` helper functions
- Removed `display` from `VALID_TOP_LEVEL_KEYS` and `resolveConfig()` defaults

### Config Docs (`src/prompts/config-docs.md`)
- Removed `### display` section entirely
- Removed `display` from full example config
- Removed `display.showCacheTokens` from validation rules list

## Verification
- Build passes cleanly (`npm run build`)
- Zero references to `cacheReadInputTokens`, `cacheCreationInputTokens`, `showCacheTokens`, `DisplayConfig`, or `TokenSummaryOptions` remain in `src/`

<promise>COMPLETE</promise>
