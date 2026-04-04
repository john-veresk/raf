---
effort: low
---
# Task: Fix Rate Limit Wait to Survive Mac Sleep

## Objective
Fix the rate limit waiter so it correctly resumes after Mac sleep by using wall-clock time instead of elapsed-time tracking.

## Context
When a Mac goes to sleep during a rate limit wait, `setTimeout` freezes but `Date.now()` advances. The current code decrements `remaining` by the requested sleep duration (`sleepMs`), so on wake it still thinks it has minutes left even though the wall-clock reset time has passed. The fix is to compute a target end time upfront and compare against `Date.now()` each iteration.

## Requirements
- Replace the `remaining -= sleepMs` countdown with a `Date.now() >= targetEndTime` wall-clock check
- Preserve existing pause/resume behavior (pause should still "stop the clock" by extending the target time)
- Preserve abort checking
- Keep the 1s chunk sleep for responsive abort/pause detection

## Implementation Steps

1. **`src/core/rate-limit-waiter.ts`** — modify `waitForRateLimit()`:

   Replace the current approach (lines 62-82):
   ```typescript
   let remaining = rawDuration;
   while (remaining > 0) {
     ...
     const sleepMs = Math.min(remaining, 1000);
     await new Promise(resolve => setTimeout(resolve, sleepMs));
     remaining -= sleepMs;
   }
   ```

   With wall-clock target approach:
   ```typescript
   let targetEndTime = Date.now() + rawDuration;

   while (Date.now() < targetEndTime) {
     if (shouldAbort()) {
       return { completed: false, waitedMs: Date.now() - startTime };
     }

     if (isPaused()) {
       const pauseStart = Date.now();
       await waitForResume();
       // Extend target by pause duration — pause time doesn't count
       targetEndTime += Date.now() - pauseStart;
       const newResetDisplay = formatResetTime(new Date(targetEndTime));
       logger.info(`  ⏳ Resuming rate limit wait. Waiting until ${newResetDisplay}...`);
       continue;
     }

     await new Promise(resolve => setTimeout(resolve, 1000));
   }
   ```

   Key changes:
   - `targetEndTime` is computed once from `Date.now() + rawDuration`
   - Loop condition checks wall clock: `Date.now() < targetEndTime`
   - Pause extends `targetEndTime` by the exact pause duration
   - No more `remaining` variable or `sleepMs` calculation

## Acceptance Criteria
- [ ] Rate limit wait exits promptly after Mac wake if the reset time has passed
- [ ] Pause/resume still works: pausing extends the wait by the paused duration
- [ ] Abort (Ctrl+C) still works during the wait
- [ ] TypeScript compiles without errors

## Notes
- The 1s sleep chunk is still used for responsive checking, but the loop exit is determined by wall-clock comparison, not accumulated sleep time.
