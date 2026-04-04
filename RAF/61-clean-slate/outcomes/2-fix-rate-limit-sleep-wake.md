# Outcome: Fix Rate Limit Sleep/Wake

## Summary

Fixed `waitForRateLimit()` to use wall-clock time instead of accumulated sleep time, so it exits promptly after Mac wake if the reset time has already passed.

## Changes Made

- **`src/core/rate-limit-waiter.ts`**: Replaced `remaining` countdown with `targetEndTime = Date.now() + rawDuration`. Loop condition is now `Date.now() < targetEndTime`. On pause, `targetEndTime` is extended by the exact pause duration. Removed `sleepMs`/`remaining` variables.

## Verification

- `tsc --noEmit` passes with no errors.

<promise>COMPLETE</promise>
