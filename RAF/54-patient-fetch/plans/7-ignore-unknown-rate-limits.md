---
effort: medium
---
# Task: Ignore Unknown Rate Limits (False Positive Fix)

## Objective
Stop RAF from pausing on "unknown" rate limit types and tighten text-fallback detection to only trigger pauses for quota-specific patterns, preventing false positive 60-minute waits.

## Context
This is a follow-up to tasks 1, 2, and 5. See outcomes:
- /Users/eremeev/projects/RAF/RAF/54-patient-fetch/outcomes/1-detect-rate-limit-events.md
- /Users/eremeev/projects/RAF/RAF/54-patient-fetch/outcomes/2-pause-and-resume.md
- /Users/eremeev/projects/RAF/RAF/54-patient-fetch/outcomes/5-simplify-rate-limit-display.md

RAF currently treats all rate limit detections identically — including "unknown" types from structured events and generic text patterns like "429" or "rate limit". This causes false positive pauses: Claude CLI emits a `rate_limit_event` with `status: 'rejected'` but no `rateLimitType`, and RAF pauses for 60 minutes on what is actually a transient API 429 that Claude Code retries internally.

## Dependencies
1, 2, 5

## Requirements
- When `rateLimitInfo.limitType` is `'unknown'`, do NOT trigger `waitForRateLimit` — let the task go through the normal retry flow (counts against `maxRetries`)
- Tighten text-fallback rate limit detection in `failure-analyzer.ts` to only match quota-specific patterns, not generic rate limit patterns
- The structured event path in `stream-renderer.ts` should still capture rate limit events with "unknown" type in `rateLimitInfo`, but `do.ts` must filter them out before deciding to pause
- Known limit types that SHOULD still trigger pause: `'five_hour'`, `'seven_day'`, `'quota_exhaustion'`, `'usage_limit_reached'`, `'daily'`, and any other specific named types — essentially anything that is NOT `'unknown'`
- Log a debug message when skipping an unknown rate limit so it's visible in verbose mode

## Implementation Steps

### Step 1: Update `src/commands/do.ts` — filter out unknown limitType before pausing

In the rate limit handling block (around line 961-998), add a check after detecting `rateLimitInfo`:
- If `rateLimitInfo` exists but `limitType === 'unknown'`, log a debug message like `"Ignoring unknown rate limit type — treating as normal retry"` and skip the `waitForRateLimit` call
- Let execution fall through to the normal retry/failure handling
- This means the attempt WILL count against `maxRetries` (unlike known rate limits which don't consume attempts)

### Step 2: Update `src/core/failure-analyzer.ts` — tighten RATE_LIMIT_PATTERNS

Split the current `RATE_LIMIT_PATTERNS` array into two categories:

**Quota-specific patterns (KEEP — these trigger pause via text fallback):**
- `/you've hit your limit/i`
- `/usage.limit.reached/i`
- `/quota exceeded/i`

**Generic patterns (REMOVE from rate limit detection — these are transient):**
- `/rate limit/i`
- `/too many requests/i`
- `/429\s+too\s+many\s+requests/i`
- `/request limit/i`
- `/throttl/i`

Update `detectProgrammaticFailure` to only return `'rate_limit'` for quota-specific patterns. The generic patterns should no longer match as `'rate_limit'` — they'll fall through to the normal failure handling.

### Step 3: Update `src/commands/do.ts` — adjust text-fallback rate limit check

The text-fallback check in `do.ts` (line ~963) uses `detectProgrammaticFailure(result.output, '') === 'rate_limit'` as a backup when there's no structured `rateLimitInfo`. After Step 2, this will naturally only trigger for quota-specific text patterns. Verify this works correctly and no additional changes are needed.

### Step 4: Verify and build

- Run `tsc --noEmit` to check TypeScript compilation
- Run `npm run build` to verify full build succeeds
- Manually trace through the logic to confirm:
  - Structured event with `limitType: 'unknown'` → normal retry (no pause)
  - Structured event with `limitType: 'five_hour'` → pause and wait (unchanged)
  - Text output containing "You've hit your limit" → pause and wait (unchanged)
  - Text output containing only "429 too many requests" → normal retry (no pause)

## Acceptance Criteria
- [ ] `rateLimitInfo` with `limitType === 'unknown'` does NOT trigger `waitForRateLimit` — task retries normally
- [ ] Generic text patterns (`rate limit`, `429`, `too many requests`, `throttl`, `request limit`) no longer trigger the pause-and-wait flow
- [ ] Quota-specific text patterns (`you've hit your limit`, `usage limit reached`, `quota exceeded`) still trigger pause-and-wait
- [ ] Known structured limit types (`five_hour`, `seven_day`, etc.) still trigger pause-and-wait (unchanged)
- [ ] A debug log message is emitted when an unknown rate limit is skipped
- [ ] TypeScript compiles cleanly (`tsc --noEmit`)
- [ ] Full build succeeds (`npm run build`)

## Notes
- The `stream-renderer.ts` and `claude-runner.ts` detection code does NOT need changes — it should still capture all rate limit events. The filtering happens at the decision point in `do.ts`.
- The `retry-handler.ts` already does NOT have rate limits in its non-retryable list, so normal retries will work.
- If in the future Claude CLI starts providing specific `rateLimitType` values for what are currently "unknown" events, those will automatically be handled correctly (pause-and-wait) since the filter only skips `'unknown'`.
