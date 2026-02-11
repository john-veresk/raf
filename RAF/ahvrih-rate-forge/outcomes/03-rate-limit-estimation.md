# Outcome: Add 5h Window Rate Limit Estimation + Plan Session Token Tracking

## Summary
Implemented estimated 5-hour rate limit window percentage display and token usage tracking for `raf plan` interactive sessions.

## Key Changes

### Config Types (`src/types/config.ts`)
- Added `DisplayConfig` interface with `showRateLimitEstimate` and `showCacheTokens` boolean fields
- Added `RateLimitWindowConfig` interface with `sonnetTokenCap` number field
- Added both to `RafConfig` with defaults: `showRateLimitEstimate: true`, `showCacheTokens: true`, `sonnetTokenCap: 88000`

### Config Validation (`src/utils/config.ts`)
- Added `display` and `rateLimitWindow` to `VALID_TOP_LEVEL_KEYS`
- Added validation for `display` (object with boolean values for known keys)
- Added validation for `rateLimitWindow` (object with positive number for `sonnetTokenCap`)
- Added deep merge support for both new sections in `deepMerge()`
- Added accessor helpers: `getDisplayConfig()`, `getRateLimitWindowConfig()`, `getShowRateLimitEstimate()`, `getShowCacheTokens()`, `getSonnetTokenCap()`

### Config Documentation (`src/prompts/config-docs.md`)
- Added `display` section explaining `showRateLimitEstimate` and `showCacheTokens`
- Added `rateLimitWindow` section explaining `sonnetTokenCap` and the conversion formula
- Updated validation rules and full example config

### Token Tracker (`src/utils/token-tracker.ts`)
- Added `calculateRateLimitPercentage(totalCost, sonnetTokenCap?)` method
  - Converts cost to Sonnet-equivalent tokens using average Sonnet pricing
  - Formula: `sonnetEquivalentTokens = cost / avgSonnetCostPerToken`, then `percentage = tokens / cap * 100`
- Added `getCumulativeRateLimitPercentage(sonnetTokenCap?)` method for grand totals

### Terminal Formatting (`src/utils/terminal-symbols.ts`)
- Added `TokenSummaryOptions` interface for display configuration
- Added `formatRateLimitPercentage(percentage)` helper (uses tilde prefix for estimate indicator)
- Updated `formatTokenLine()` to accept options and conditionally show cache tokens and rate limit
- Updated `formatTaskTokenSummary()` to accept options (rate limit only on total for multi-attempt)
- Updated `formatTokenTotalSummary()` to accept options

### Claude Runner (`src/core/claude-runner.ts`)
- Added `sessionId` option to `ClaudeRunnerOptions`
- Updated `runInteractive()` to pass `--session-id <uuid>` when sessionId is provided

### Session Parser (`src/utils/session-parser.ts`) - NEW FILE
- `escapeProjectPath(path)` - escapes project path for Claude's naming scheme
- `getSessionFilePath(sessionId, cwd)` - computes expected session file location
- `parseSessionFile(filePath)` - parses JSONL, accumulates usage from assistant messages
- `parseSessionById(sessionId, cwd)` - convenience wrapper
- Handles missing files, malformed JSON lines, entries without usage/model gracefully

### Plan Command (`src/commands/plan.ts`)
- Generates UUID session ID before `runInteractive()` calls
- Passes sessionId to both plan and amend flows
- Added `displayPlanSessionTokenSummary()` to parse session file and display formatted usage
  - Uses `TokenTracker` and display config for consistent formatting
  - Logs debug message if session file not found (graceful degradation)

### Tests Added
- `tests/unit/config.test.ts`: 15 tests for display/rateLimitWindow validation and resolution
- `tests/unit/token-tracker.test.ts`: 7 tests for rate limit percentage calculation
- `tests/unit/terminal-symbols.test.ts`: 13 tests for display options and rate limit formatting
- `tests/unit/session-parser.test.ts`: 15 tests (new file) for session file parsing

## Acceptance Criteria Verification
- [x] After each task, token summary includes `~X% of 5h window` when enabled
- [x] Grand total summary includes cumulative percentage when enabled
- [x] Percentage correctly reflects cost-weighted usage (Opus > Sonnet > Haiku)
- [x] Multi-model tasks correctly account for different models across attempts
- [x] `display.showRateLimitEstimate: false` hides the percentage
- [x] `display.showCacheTokens: false` hides cache token counts
- [x] `rateLimitWindow.sonnetTokenCap` correctly adjusts the denominator
- [x] Config validation accepts the new keys
- [x] Config docs updated with new keys and explanation
- [x] After `raf plan` interactive session, token usage summary is displayed
- [x] After `raf plan --amend` interactive session, token usage summary is displayed
- [x] Session file parsing handles missing/malformed files gracefully
- [x] Tests cover conversion math, display toggling, and session file parsing

## Notes
- The pre-existing test failures in `claude-runner-interactive.test.ts` and `validation.test.ts` are unrelated to this change - they concern model resolution and effort level handling
- The rate limit percentage is deliberately marked as an estimate with tilde (~) prefix since the actual Anthropic algorithm may differ
- Session file location is based on Claude CLI's current storage format (`~/.claude/projects/<escaped-path>/<session-id>.jsonl`)

<promise>COMPLETE</promise>
