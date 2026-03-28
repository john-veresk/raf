---
effort: high
---
# Task: Detect Rate Limit Events in Stream Output

## Objective
Detect quota-exhaustion rate limit events from both Claude Code and Codex CLI output, extracting the reset timestamp.

## Context
When Claude Code or Codex hit their daily/plan usage limits, they emit specific events but RAF currently ignores them. Claude Code emits `rate_limit_event` JSON events with `status: "rejected"` and a `resetsAt` Unix timestamp in stream-json mode. It also emits `result` events with `is_error: true` and `subtype: "error_during_execution"`. Codex returns errors with `error_type: "usage_limit_reached"` and a `resets_at` field. Both CLIs exit with code 0 for quota exhaustion, so exit code cannot be used for detection.

Currently, `stream-renderer.ts` silently discards all `system` events and unknown event types (including `rate_limit_event`). The `RunResult` interface has no field for rate limit info. The failure analyzer detects rate limits via regex but marks them non-retryable.

## Requirements
- Parse `rate_limit_event` events from Claude Code's stream-json output, extracting `resetsAt` (Unix timestamp) and `rateLimitType`
- Parse `system/api_retry` events with `error: "rate_limit"` to detect transient rate limits (these are retried internally by Claude Code — log them but don't act)
- Detect the `result` event's `is_error: true` field as confirmation that execution failed
- For Codex: detect `usage_limit_reached` errors in the JSON output and extract `resets_at`
- Also detect the text pattern "You've hit your limit · resets" as a fallback for plain-text output
- Add a `rateLimitInfo` field to `RunResult` containing the reset timestamp (as a `Date`) and limit type
- Ensure the rate limit info propagates up to the retry loop in `do.ts`

## Implementation Steps

1. **Define rate limit types** in `src/core/runner-types.ts`:
   ```typescript
   export interface RateLimitInfo {
     resetsAt: Date;
     limitType: string; // e.g. 'five_hour', 'seven_day', 'usage_limit_reached'
   }
   ```
   Add `rateLimitInfo?: RateLimitInfo` to the `RunResult` interface.

2. **Update `src/parsers/stream-renderer.ts`** to handle new event types:
   - Add a `rate_limit_event` case in the `renderStreamEvent` switch. When `status === 'rejected'`, extract `resetsAt` and return it in the `RenderResult`.
   - Add a `RenderResult.rateLimitInfo` optional field.
   - For `system` events with `subtype: 'api_retry'` and `error: 'rate_limit'`, log a debug message showing retry attempt info but don't set rateLimitInfo (Claude Code handles these internally).

3. **Update `src/core/claude-runner.ts`** `_runStreamJson` method:
   - In the stdout data handler where `renderStreamEvent` results are processed (around line 370), check for `rendered.rateLimitInfo` and store it.
   - Also check the `result` event for `is_error: true` — if rateLimitInfo is set, this confirms quota exhaustion.
   - Pass `rateLimitInfo` into the `RunResult` resolved by the close handler.

4. **Update `src/core/codex-runner.ts`** similarly:
   - In the JSONL processing loop, look for JSON objects with `error_type: "usage_limit_reached"` and extract `resets_at`.
   - Store as `rateLimitInfo` on the result.

5. **Add text-based fallback detection** in both runners:
   - After the process closes, scan `stderr` and `output` for the pattern: `/you've hit your limit.*resets\s+(\d{1,2}(?:am|pm))/i` or `/usage limit reached/i` or `/resets at\s+(.+)/i`
   - Parse the reset time into a `Date`. If only a time like "10am" is found, assume it's today (or tomorrow if that time has passed), using the system's local timezone.
   - Only set `rateLimitInfo` from text fallback if the structured event wasn't already captured.

6. **Add pattern to `RATE_LIMIT_PATTERNS`** in `src/core/failure-analyzer.ts`:
   - Add `/you've hit your limit/i` and `/usage.limit.reached/i` to the existing patterns.

## Acceptance Criteria
- [ ] `rate_limit_event` with `status: "rejected"` is parsed from Claude Code stream-json output, and `resetsAt` is extracted as a `Date`
- [ ] Codex `usage_limit_reached` errors are parsed and `resets_at` is extracted
- [ ] Text fallback "You've hit your limit · resets 10am" is detected and parsed into a `Date`
- [ ] `RunResult.rateLimitInfo` is populated when any rate limit is detected
- [ ] `system/api_retry` events with `error: "rate_limit"` are logged at debug level but do NOT set rateLimitInfo (these are transient and handled by Claude Code internally)
- [ ] Existing output parsing (completion markers, usage data, context overflow) is unaffected

## Notes
- Claude Code's `rate_limit_event` includes a `resetsAt` field as a Unix timestamp (seconds). Convert with `new Date(resetsAt * 1000)`.
- The text fallback is important because some rate limit messages may appear in stderr rather than the structured stream.
- The `rateLimitType` values from Claude Code include: `five_hour`, `seven_day`, `seven_day_opus`, `seven_day_sonnet`, `overage`.
- Codex uses `error_type: "usage_limit_reached"` at the top level of the JSON response.
