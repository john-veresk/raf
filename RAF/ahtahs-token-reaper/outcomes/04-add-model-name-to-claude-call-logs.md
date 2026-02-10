# Task 04: Add Model Name to Claude Invocation Logs

## Summary

Added a `getModelShortName()` utility function and updated all four Claude invocation log messages to display the short model alias (e.g., "sonnet", "haiku", "opus").

## Changes Made

### src/utils/config.ts
- Added `getModelShortName(modelId: string)` utility function that:
  - Returns short aliases (`opus`, `sonnet`, `haiku`) as-is
  - Extracts family from full model IDs (e.g., `claude-sonnet-4-5-20250929` → `sonnet`)
  - Returns unknown model IDs as-is for graceful fallback

### src/commands/plan.ts
- Added import for `getModel` and `getModelShortName`
- Updated name generation log: `"Generating project name suggestions with ${nameModel}..."`

### src/commands/do.ts
- Added import for `getModel` and `getModelShortName`
- Updated failure analysis log: `"Analyzing failure with ${analysisModel}..."`

### src/core/pull-request.ts
- Added import for `getModelShortName`
- Added new log message in `generatePrBody()`: `"Generating PR with ${prModel}..."`

### src/commands/config.ts
- Added import for `getModelShortName`
- Consolidated two log lines into one: `"Starting config session with ${configModel}..."`
  - Previously: "Starting config session with Claude..." + "Using model: ${model}"
  - Now: single line with short model name

### tests/unit/config.test.ts
- Added import for `getModelShortName`
- Added test suite with 3 test cases:
  - `should return short aliases as-is`
  - `should extract family from full model IDs`
  - `should return unknown model IDs as-is`

## Acceptance Criteria Verification

- [x] All four Claude invocation points show the model short name in their log messages
  - Name generation: `"Generating project name suggestions with sonnet..."`
  - Failure analysis: `"Analyzing failure with haiku..."`
  - PR generation: `"Generating PR with sonnet..."`
  - Config session: `"Starting config session with sonnet..."`
- [x] Short name extraction works for full model IDs and already-short names
- [x] Log format follows the "...with <model>..." pattern
- [x] Unit tests cover the short name utility (3 tests)
- [x] All tests pass (95 config tests, 1156 total passing)

## Notes

- Pre-existing test failures in `validation.test.ts` and `claude-runner-interactive.test.ts` are unrelated to this task
- The `getModelShortName()` function reuses logic similar to `resolveModelPricingCategory()` but returns the original string for unknown models instead of `null`

<promise>COMPLETE</promise>
