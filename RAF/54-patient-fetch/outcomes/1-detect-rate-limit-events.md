# Outcome: Detect Rate Limit Events in Stream Output

## Summary
Implemented rate limit event detection for both Claude Code and Codex CLI output, extracting reset timestamps and propagating them via `RunResult.rateLimitInfo`.

## Key Changes

### `src/core/runner-types.ts`
- Added `RateLimitInfo` interface with `resetsAt: Date` and `limitType: string`
- Added optional `rateLimitInfo` field to `RunResult`

### `src/parsers/stream-renderer.ts`
- Added `rateLimitInfo` field to `RenderResult` interface
- Added `rate_limit_event` case in the switch — extracts `resetsAt` (Unix timestamp) and `rateLimitType` when `status === 'rejected'`
- Updated `system` event handler to log `api_retry` events with `error: 'rate_limit'` at debug level (transient, handled by Claude Code internally — does NOT set rateLimitInfo)
- Added `StreamEvent` fields: `status`, `resetsAt`, `rateLimitType`, `is_error`, `error`, `retry_attempt`

### `src/core/claude-runner.ts`
- Captures `rateLimitInfo` from rendered stream events during JSONL processing
- Added text fallback detection (`detectRateLimitFromText`) for patterns: "You've hit your limit · resets 10am", "resets at <timestamp>", "usage limit reached"
- `parseResetTime` handles time-of-day strings like "10am" with today/tomorrow logic
- Passes `rateLimitInfo` into the `RunResult`

### `src/core/codex-runner.ts`
- Added `detectCodexRateLimitFromEvent` to detect `error_type: "usage_limit_reached"` in JSONL events, extracting `resets_at`
- Same text fallback detection as claude-runner
- Passes `rateLimitInfo` into the `RunResult`

### `src/core/failure-analyzer.ts`
- Added `/you've hit your limit/i` and `/usage.limit.reached/i` to `RATE_LIMIT_PATTERNS`

## Verification
- TypeScript compiles cleanly (`tsc --noEmit` and `npm run build` pass)
- Existing output parsing (completion markers, usage data, context overflow) is unaffected

<promise>COMPLETE</promise>
