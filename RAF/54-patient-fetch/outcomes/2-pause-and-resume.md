# Outcome: Implement Pause & Auto-Resume on Rate Limit

## Summary
When a rate limit is detected (via `rateLimitInfo` or text pattern matching), RAF now pauses execution with a live countdown timer and automatically resumes when the limit resets, instead of treating rate limits as terminal failures.

## Key Changes

### `src/types/config.ts`
- Added `rateLimitWaitDefault: number` to `RafConfig` interface (default: 60 minutes)
- Added to `DEFAULT_CONFIG` with value `60`

### `src/core/rate-limit-waiter.ts` (new file)
- `waitForRateLimit(options)` — returns a Promise that resolves after countdown or abort
- Live countdown via `setInterval(1000)` calling `onTick` with formatted message
- Format: `⏳ Rate limit hit (five_hour). Resuming in 2h 14m 30s (resets 10:00 EET)`
- 30s safety buffer on all waits (API propagation delay)
- 60s extra buffer when reset time is < 10s away or in the past
- `shouldAbort` callback checked each tick for Ctrl+C support

### `src/core/shutdown-handler.ts`
- Changed `isShuttingDown` from private field to public getter (backed by `_isShuttingDown`)
- Enables the rate limit waiter to check shutdown state

### `src/commands/do.ts`
- Added import for `waitForRateLimit` and `detectProgrammaticFailure`
- Added import for `getResolvedConfig` (for `rateLimitWaitDefault` access)
- Added `rateLimitWaits` counter (capped at 3 per task to avoid infinite loops)
- After task run, checks `result.rateLimitInfo` first; falls back to `detectProgrammaticFailure` text matching
- On rate limit: waits via countdown, then retries WITHOUT incrementing the attempt counter (`attempts--`)
- On abort (Ctrl+C): breaks out of the loop cleanly
- Unknown reset times use `rateLimitWaitDefault` from config as fallback

### `src/core/retry-handler.ts`
- Removed `'rate limit exceeded'` from the `nonRetryable` error list

### `src/core/failure-analyzer.ts`
- Updated `rate_limit` case text: "RAF will automatically wait and retry" instead of manual retry suggestions

## Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Full build succeeds (`npm run build` passes)
- Rate limit waits do NOT count against `maxRetries`
- Capped at 3 rate-limit waits per task to prevent infinite loops

<promise>COMPLETE</promise>
