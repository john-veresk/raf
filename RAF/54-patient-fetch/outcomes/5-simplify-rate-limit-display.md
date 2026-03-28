# Outcome: Simplify Rate Limit Display

## Summary
Replaced the live countdown timer with a static "Waiting until" message and removed the bottom status bar ticker during rate limit pauses. Added P-key pause support during the wait.

## Key Changes

### `src/core/rate-limit-waiter.ts`
- Removed `onTick` callback parameter and the `setInterval(1000)` countdown loop
- Removed `formatDuration` helper (only used for countdown display)
- Changed to a simple `while` loop with 1s sleeps for abort/pause polling
- Logs a single static message: `⏳ Rate limit hit (type). Waiting until HH:MM TZ...`
- Added `isPaused` and `waitForResume` callbacks for P-key pause support
- On resume from pause, logs updated ETA (pause time doesn't count against wait)
- All safety buffers (30s / 60s) preserved unchanged

### `src/commands/do.ts`
- Removed `onTick: (msg) => statusLine.update(msg)` from `waitForRateLimit` call
- Added `statusLine.clear()` before the wait to remove the task progress ticker
- Wired `isPaused: () => keyboard.isPaused` and `waitForResume: () => keyboard.waitForResume()` for P-key pause

## Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- Full build succeeds (`npm run build`)
- All acceptance criteria met

<promise>COMPLETE</promise>
