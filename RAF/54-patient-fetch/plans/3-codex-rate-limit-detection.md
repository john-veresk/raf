---
effort: medium
---
# Task: Codex-Specific Rate Limit Detection

## Objective
Add structured rate limit detection for the Codex runner, handling its distinct error format and response patterns.

## Context
Task 1 defines the `RateLimitInfo` type and updates the Claude runner. This task focuses on the Codex runner's specific error format. Codex CLI uses `--json` output mode and returns errors with `error_type: "usage_limit_reached"` at the top level of the response JSON. The error includes `resets_at` as a Unix timestamp. Codex also has different limit types (plan-based: Free, Plus, Pro, Team, Business, Enterprise) that determine the user-facing message.

The Codex runner (`codex-runner.ts`) processes JSONL output similarly to the Claude runner but uses `renderCodexStreamEvent` for parsing.

## Dependencies
1

## Requirements
- Detect `usage_limit_reached` errors in Codex JSON output
- Extract `resets_at` timestamp from the error response
- Detect `server_is_overloaded` / `slow_down` errors (not retryable with wait — different from quota)
- Map Codex error types to `RateLimitInfo`
- Handle the case where Codex outputs the error as a final JSON object (not a stream event)

## Implementation Steps

1. **Read the Codex stream renderer** at `src/parsers/codex-stream-renderer.ts` and understand its event format.

2. **Add Codex rate limit parsing** in the Codex stream renderer:
   - Look for JSON objects with `error_type: "usage_limit_reached"` or containing `"usage_limit_reached"` in an error message field
   - Extract `resets_at` (may be a Unix timestamp or ISO string)
   - Return as `rateLimitInfo` in the render result

3. **Update `src/core/codex-runner.ts`** in the JSONL processing loop:
   - Check each parsed line for rate limit info from the renderer
   - Also check stderr output for rate-limit-related text patterns
   - Store the first detected `rateLimitInfo` and pass it to `RunResult`

4. **Add text fallback patterns** specific to Codex error messages:
   - `/usage.limit.reached/i`
   - `/upgrade to (plus|pro)/i`
   - `/try again at\s+(.+)/i`
   - Parse the reset time from the "Try again at [timestamp]" message

5. **Test with Codex error format** — add detection for this JSON structure:
   ```json
   {
     "error": {
       "type": "usage_limit_reached",
       "message": "...",
       "resets_at": 1711612800
     }
   }
   ```

## Acceptance Criteria
- [ ] Codex `usage_limit_reached` errors are detected and `resets_at` is extracted
- [ ] `RateLimitInfo` is correctly populated in `RunResult` for Codex runs
- [ ] Text fallback patterns catch Codex-specific error messages
- [ ] Server overload errors (`server_is_overloaded`) are NOT treated as rate limits (they should remain non-retryable failures)
- [ ] The pause & resume logic from Task 2 works with Codex rate limits the same as Claude

## Notes
- Codex rate limit reset times may be in different formats — handle both Unix timestamps and ISO 8601 strings.
- The exact JSON structure of Codex's rate limit response may vary. Be defensive: check for `error_type` at the top level and also nested under an `error` key.
- Codex's `server_is_overloaded` is a capacity issue (use a different model), NOT a quota limit — do not wait for it.
