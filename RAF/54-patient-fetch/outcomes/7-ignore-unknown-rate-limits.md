# Outcome: Ignore Unknown Rate Limits (False Positive Fix)

## Summary
Prevented RAF from pausing for 60 minutes on transient API 429 errors by filtering out "unknown" rate limit types and tightening text-fallback patterns to only match quota-specific messages.

## Key Changes

### `src/commands/do.ts`
- Added check: when `rateLimitInfo.limitType === 'unknown'`, skip `waitForRateLimit` and let the task fall through to normal retry handling (counts against `maxRetries`)
- Logs `"Ignoring unknown rate limit type — treating as normal retry"` at debug level

### `src/core/failure-analyzer.ts`
- Removed generic patterns from `RATE_LIMIT_PATTERNS`: `/rate limit/i`, `/too many requests/i`, `/429\s+too\s+many\s+requests/i`, `/request limit/i`, `/throttl/i`
- Kept only quota-specific patterns: `/you've hit your limit/i`, `/usage.limit.reached/i`, `/quota exceeded/i`

## Acceptance Criteria Verification
- [x] `rateLimitInfo` with `limitType === 'unknown'` does NOT trigger `waitForRateLimit` — task retries normally
- [x] Generic text patterns (`rate limit`, `429`, `too many requests`, `throttl`, `request limit`) no longer trigger pause-and-wait
- [x] Quota-specific text patterns (`you've hit your limit`, `usage limit reached`, `quota exceeded`) still trigger pause-and-wait
- [x] Known structured limit types (`five_hour`, `seven_day`, etc.) still trigger pause-and-wait (unchanged)
- [x] A debug log message is emitted when an unknown rate limit is skipped
- [x] TypeScript compiles cleanly (`tsc --noEmit`)
- [x] Full build succeeds (`npm run build`)

<promise>COMPLETE</promise>
