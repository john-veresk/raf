---
effort: medium
---
# Task: Remove Cache From Status Display

## Objective
Remove all cache token tracking (read/created) from the `raf do` status output, interfaces, and config — leaving only tokens in/out and cost.

## Context
The cache token display (cache read / cache created counts) adds noise to the status output without providing actionable information. The user wants a cleaner, compact output showing only input tokens, output tokens, and dollar cost.

## Requirements
- Remove `cacheReadInputTokens` and `cacheCreationInputTokens` fields from `UsageData` and `ModelTokenUsage` interfaces
- Remove `DisplayConfig` interface and `display` field from `RafConfig` / `DEFAULT_CONFIG`
- Remove all cache display logic from `formatTokenLine()` in `terminal-symbols.ts`
- Remove the `showCacheTokens` option / `TokenSummaryOptions` type if it becomes empty
- Remove cache accumulation from `token-tracker.ts` (`mergeUsageData`, `accumulateUsage`, default objects)
- Remove cache fields from stream parsers that populate `UsageData` (`stream-renderer.ts`, `codex-stream-renderer.ts`)
- Remove `display` validation from config validator (`src/utils/config.ts`)
- Remove `display` section from config docs (`src/prompts/config-docs.md`)
- Remove `display` references from all example configs in docs
- Update `getShowCacheTokens()` call sites in `do.ts` — remove the option passing entirely

## Implementation Steps
1. **Update interfaces** (`src/types/config.ts`):
   - Remove `cacheReadInputTokens` and `cacheCreationInputTokens` from `UsageData` interface
   - Remove `cacheReadInputTokens` and `cacheCreationInputTokens` from `ModelTokenUsage` interface
   - Remove `DisplayConfig` interface
   - Remove `display` from `RafConfig` interface and `DEFAULT_CONFIG`

2. **Update token tracker** (`src/utils/token-tracker.ts`):
   - Remove all `cacheReadInputTokens` and `cacheCreationInputTokens` references from `mergeUsageData()`
   - Remove from `accumulateUsage()` default return
   - Remove from `getTotals()` default return

3. **Update display formatting** (`src/utils/terminal-symbols.ts`):
   - Remove cache display block from `formatTokenLine()` (lines 209-220)
   - Remove `showCacheTokens` from `TokenSummaryOptions` — if it becomes empty, remove the type entirely
   - Update JSDoc comments that reference cache display

4. **Update stream parsers** (`src/parsers/stream-renderer.ts`, `src/parsers/codex-stream-renderer.ts`):
   - Remove cache field population when building `UsageData` objects

5. **Update do.ts** (`src/commands/do.ts`):
   - Remove `getShowCacheTokens()` calls and the `showCacheTokens` option passing to formatters
   - Remove any import of display config helpers

6. **Update claude-runner.ts** (`src/core/claude-runner.ts`):
   - Remove any cache-related usage data handling

7. **Update config validator** (`src/utils/config.ts`):
   - Remove `display` key validation
   - Remove `showCacheTokens` validation

8. **Update config docs** (`src/prompts/config-docs.md`):
   - Remove the `### display` section entirely
   - Remove `display` from all example configs (especially the "Full" example)
   - Remove `display.showCacheTokens` from the validation rules list

9. **Build and verify** — run `npm run build` to confirm no type errors remain

## Acceptance Criteria
- [ ] `UsageData` and `ModelTokenUsage` no longer contain cache fields
- [ ] `DisplayConfig` and `display` removed from config types and defaults
- [ ] Token summary output shows only: `Tokens: X in / Y out | Cost: $Z`
- [ ] No references to `cacheReadInputTokens`, `cacheCreationInputTokens`, or `showCacheTokens` remain in `src/`
- [ ] Config validator no longer accepts or validates a `display` key
- [ ] Config docs have no mention of cache tokens or `display` section
- [ ] Project builds cleanly (`npm run build`)

## Notes
- The cache fields originally came from Claude API responses. When removing them from the interfaces, the parsers that read API output will simply stop extracting those fields — the API may still return them but they'll be ignored.
- There are 9 files that reference cache/display fields. All must be updated in a single coherent pass.
