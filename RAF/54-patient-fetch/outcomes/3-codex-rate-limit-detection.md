# Outcome: Codex-Specific Rate Limit Detection

## Summary
Enhanced Codex runner with structured rate limit detection that handles Codex's distinct error formats (top-level and nested), adds Codex-specific text fallback patterns, and explicitly excludes `server_is_overloaded`/`slow_down` from rate limit treatment.

## Key Changes

### `src/parsers/codex-stream-renderer.ts`
- Added `error_type`, `resets_at`, and nested `error.type`/`error.resets_at` fields to `CodexEvent` interface
- Added `parseResetsAt()` helper — handles both Unix timestamps and ISO 8601 strings
- Added `detectRateLimitFromEvent()` — checks both top-level `error_type` and nested `error.type`, explicitly returns `undefined` for `server_is_overloaded`/`slow_down`
- Updated `renderError()` and `renderTurnFailed()` to return `rateLimitInfo` in their `RenderResult`

### `src/core/codex-runner.ts`
- Enhanced `detectCodexRateLimitFromEvent()` to check nested `error.type` in addition to top-level `error_type`
- Added explicit `server_is_overloaded`/`slow_down` exclusion (returns undefined, not rate limit)
- Added text fallback patterns: `/try again at\s+(.+)/i` (with timestamp parsing), `/upgrade to (plus|pro)/i`
- Updated JSONL processing loop (both streaming and remaining-buffer) to prefer renderer's `rateLimitInfo` before falling back to raw JSON parsing

### `src/core/failure-analyzer.ts`
- No changes needed — patterns from Task 1 (`/usage.limit.reached/i`) already cover Codex

## Acceptance Criteria Verification
- [x] Codex `usage_limit_reached` errors detected at top-level and nested `error.type`
- [x] `resets_at` extracted from both Unix timestamps and ISO 8601 strings
- [x] `RateLimitInfo` correctly populated in `RunResult` for Codex runs
- [x] Text fallback patterns catch Codex-specific messages (`try again at`, `upgrade to plus/pro`)
- [x] `server_is_overloaded`/`slow_down` explicitly NOT treated as rate limits
- [x] Pause & resume logic from Task 2 works unchanged — `rateLimitInfo` flows through the same `RunResult` path
- [x] TypeScript compiles cleanly (`tsc --noEmit` and `npm run build` pass)

<promise>COMPLETE</promise>
