# Outcome: Unify Task Execution to Stream-JSON Format

## Summary

Unified both `run()` and `runVerbose()` methods in `ClaudeRunner` to use `--output-format stream-json --verbose` internally, enabling token usage data extraction from every task execution. The difference between verbose and non-verbose is now purely a display concern.

## Changes Made

### `src/types/config.ts`
- Added `ModelTokenUsage` interface (per-model token breakdown)
- Added `UsageData` interface (aggregate + per-model token usage)

### `src/parsers/stream-renderer.ts`
- Added `UsageData` and `ModelTokenUsage` imports from types
- Extended `StreamEvent` interface with `usage` and `modelUsage` fields
- Added `usageData?: UsageData` field to `RenderResult` interface
- Updated `renderResult()` to extract usage data from result events
- Added `extractUsageData()` helper function

### `src/core/claude-runner.ts`
- Added `UsageData` import from types
- Added `usageData?: UsageData` field to `RunResult` interface
- Replaced separate `run()` and `runVerbose()` implementations with a unified `_runStreamJson()` private method
- `run()` now delegates to `_runStreamJson(prompt, options, false)` — suppresses display
- `runVerbose()` now delegates to `_runStreamJson(prompt, options, true)` — shows display
- Both methods now use `--output-format stream-json --verbose` flags
- Both methods capture `usageData` from the stream-json result event

### `tests/unit/stream-renderer.test.ts`
- Added 4 new tests for usage data extraction from result events
- Tests cover: full usage data, missing usage, partial usage, multi-model usage

### `tests/unit/claude-runner.test.ts`
- Updated test asserting `run()` does NOT have stream-json flags → now asserts it DOES
- Added trailing newlines to context overflow test data (needed for NDJSON line buffering)
- Added 4 new tests in "usage data extraction" describe block:
  - `run()` returns usageData from result events
  - `runVerbose()` returns usageData from result events
  - undefined usageData when no result event
  - `run()` suppresses display but still captures usage data

## Verification

- TypeScript build passes cleanly
- All 1073 tests pass (8 new tests added)
- 1 pre-existing test failure confirmed unrelated (same on base branch)

<promise>COMPLETE</promise>
