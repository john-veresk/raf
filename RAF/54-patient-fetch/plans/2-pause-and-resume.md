---
effort: high
---
# Task: Implement Pause & Auto-Resume on Rate Limit

## Objective
When a rate limit is detected, pause execution with a live countdown timer and automatically resume when the limit resets.

## Context
Task 1 adds rate limit detection and `rateLimitInfo` to `RunResult`. This task uses that info in the retry loop (`do.ts`) to pause execution instead of failing. Currently, rate limits are treated as non-retryable in both `retry-handler.ts` and the do.ts loop. We need to change rate limits from a terminal failure into a "wait and retry" flow.

The user wants a live countdown display like: `Rate limit hit. Resuming in 2h 14m 30s (resets 10:00 Europe/Helsinki)`.

## Dependencies
1

## Requirements
- When `result.rateLimitInfo` is present after a task run, pause execution until `resetsAt`
- Show a live countdown timer updating every second on the status line
- Format: `⏳ Rate limit hit (five_hour). Resuming in Xh Ym Zs (resets HH:MM TZ)`
- After the wait completes, retry the current task (this counts as a retry attempt)
- If `resetsAt` is in the past or less than 10 seconds away, add a 60-second buffer (API may not be immediately available at the exact reset time)
- If `resetsAt` cannot be determined (rateLimitInfo is missing but rate_limit failure type detected), fall back to a configurable default wait time
- Respect Ctrl+C during the wait — allow graceful shutdown
- Respect the existing `P` key pause toggle — if paused during countdown, stop the countdown and wait for unpause

## Implementation Steps

1. **Add config key** `rateLimitWaitDefault` to `RafConfig` in `src/types/config.ts`:
   ```typescript
   /** Default wait time in minutes when rate limit reset time is unknown. Default: 60 */
   rateLimitWaitDefault: number;
   ```
   Add to `DEFAULT_CONFIG` with value `60`.

2. **Create `src/core/rate-limit-waiter.ts`**:
   ```typescript
   import { logger } from '../utils/logger.js';

   export interface RateLimitWaitOptions {
     resetsAt: Date;
     limitType: string;
     /** Callback checked each second — if true, abort the wait */
     shouldAbort: () => boolean;
     /** Status line writer for countdown display */
     onTick?: (message: string) => void;
   }

   export interface RateLimitWaitResult {
     completed: boolean;  // true if waited until reset, false if aborted
     waitedMs: number;
   }
   ```

   Implement `waitForRateLimit(options: RateLimitWaitOptions): Promise<RateLimitWaitResult>`:
   - Calculate wait duration: `resetsAt.getTime() - Date.now()`
   - If duration < 10_000ms, add 60_000ms buffer
   - Add 30s safety buffer to all waits (API may not be ready exactly at reset)
   - Use a `setInterval` of 1000ms for the countdown tick
   - Each tick: format remaining time as `Xh Ym Zs`, call `onTick` with the display string
   - Format reset time using `Intl.DateTimeFormat` with the system timezone for the "(resets HH:MM TZ)" part
   - Wrap in a Promise that resolves when countdown reaches 0 or `shouldAbort()` returns true
   - Clear the interval on completion

3. **Update the retry loop in `src/commands/do.ts`** (around line 940-1005):
   - After `const result = ...` (line 948-950), before parsing, check `result.rateLimitInfo`:
     ```typescript
     if (result.rateLimitInfo) {
       // Rate limit detected — wait and retry
       logger.info(`  Rate limit hit (${result.rateLimitInfo.limitType})`);
       const waitResult = await waitForRateLimit({
         resetsAt: result.rateLimitInfo.resetsAt,
         limitType: result.rateLimitInfo.limitType,
         shouldAbort: () => shutdownHandler.isShuttingDown,
         onTick: (msg) => statusLine.update(msg),
       });
       if (waitResult.completed) {
         logger.info('  Rate limit reset — resuming');
         failureHistory.push({ attempt: attempts, reason: `Rate limit (${result.rateLimitInfo.limitType}) — waited ${Math.round(waitResult.waitedMs / 1000)}s` });
         continue; // retry the task
       } else {
         failureReason = 'Rate limit wait aborted';
         break;
       }
     }
     ```
   - Also handle the case where `rateLimitInfo` is NOT present but the failure analyzer detects `rate_limit` type. In this case, use the fallback wait time from config:
     ```typescript
     const fallbackResetTime = new Date(Date.now() + config.rateLimitWaitDefault * 60 * 1000);
     ```

4. **Update `src/core/retry-handler.ts`** — remove `'rate limit exceeded'` from the `nonRetryable` list so rate limits are treated as retryable.

5. **Update `src/core/failure-analyzer.ts`** — change the `rate_limit` case in `generateProgrammaticReport` to say "RAF will automatically wait and retry" instead of the current suggestion.

6. **Integrate with shutdown handler** — In `src/core/shutdown-handler.ts`, ensure that `isShuttingDown` is checked by the waiter so Ctrl+C during the countdown triggers a clean exit.

## Acceptance Criteria
- [ ] When Claude Code or Codex returns a rate limit, RAF pauses with a live countdown showing remaining time
- [ ] Countdown format: `⏳ Rate limit hit (five_hour). Resuming in 2h 14m 30s (resets 10:00 Europe/Helsinki)`
- [ ] After the countdown completes, the current task is retried automatically
- [ ] If reset time is unknown, RAF waits `rateLimitWaitDefault` minutes (default: 60)
- [ ] `rateLimitWaitDefault` is configurable via `raf config set rateLimitWaitDefault 30`
- [ ] Ctrl+C during the wait triggers graceful shutdown (doesn't hang)
- [ ] Rate limits no longer cause immediate task failure — they are retryable after waiting
- [ ] The rate limit wait does NOT count against `maxRetries` OR it should use the same attempt (not increment) — the user should get the full retry budget after a rate limit wait

## Notes
- The 30-second safety buffer after `resetsAt` is because APIs often have a brief propagation delay after the official reset time.
- The rate limit wait should NOT count as a retry attempt. The `attempts` counter should not increment for rate limit waits. Adjust the retry loop: when a rate limit triggers a wait, `continue` without incrementing attempts. This may require restructuring the loop slightly since `attempts++` is at the top.
- Consider: if the same task hits rate limits repeatedly (e.g., limit resets but is immediately re-hit), cap at 3 rate-limit waits per task to avoid infinite loops.
