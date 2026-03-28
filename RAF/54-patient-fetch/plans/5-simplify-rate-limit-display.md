---
effort: low
---
# Task: Simplify Rate Limit Display

## Objective
Replace the live countdown timer with a static "Waiting until" message and remove the bottom status ticker when RAF pauses for rate limits.

## Context
This is a follow-up to task 2. See outcome: /Users/eremeev/projects/RAF/RAF/54-patient-fetch/outcomes/2-pause-and-resume.md

The current implementation shows a live countdown ("Resuming in 32m 22s") that updates every second via a `setInterval(1000)` loop. This is unnecessary — knowing the reset time is sufficient. The countdown also drives a bottom status bar ticker that clutters the display.

## Requirements
- Replace live countdown with a single static log message: `⏳ Rate limit hit (${reason}). Waiting until ${resetTime}...`
- Remove the bottom status bar / ticker line entirely
- Replace the `setInterval` loop with a single `setTimeout` for the wait duration
- Use `AbortController` (or equivalent) for clean abort on Ctrl+C / shutdown, instead of checking `shouldAbort` every tick
- **User must still be able to press "P" to pause during the rate limit wait.** When P is pressed, clear the `setTimeout` and enter the regular manual pause flow (same as pressing P during task execution). When the user resumes from manual pause, restart the rate limit wait with the remaining time.
- Keep the 30s safety buffer on all waits
- Keep the 60s extra buffer when reset time is < 10s away or in the past
- Keep the fallback to `rateLimitWaitDefault` when reset time is unknown (message: `⏳ Rate limit hit (${reason}). Waiting ${waitMinutes}m (unknown reset time)...`)

## Implementation Steps
1. Open `src/core/rate-limit-waiter.ts`
2. Remove the `onTick` callback parameter and the `setInterval` loop
3. Add a single `setTimeout` that resolves after the computed wait duration
4. Wire up `AbortController` — on shutdown signal, clear the timeout and resolve/reject
5. Add support for a `onPause` callback (or signal): when the user presses P, clear the `setTimeout`, record the remaining wait time, and invoke the regular pause flow. When pause ends, restart the `setTimeout` with the remaining duration.
6. Log the static message once at the start of the wait (via the existing logging mechanism in `src/commands/do.ts`)
7. Update `src/commands/do.ts` to remove any bottom-ticker / status-line rendering for rate limit waits — just log the static message
8. Wire up the P keypress handler in `do.ts` so it triggers the pause callback during rate limit waits (investigate how P is currently handled during task execution and reuse that pattern)
9. Update the format string from `Resuming in Xm Ys (resets HH:MM TZ)` to `Waiting until HH:MM TZ...`

## Acceptance Criteria
- [ ] No live countdown or per-second updates during rate limit wait
- [ ] Single static message logged: `⏳ Rate limit hit (reason). Waiting until HH:MM TZ...`
- [ ] No bottom status bar ticker during rate limit pause
- [ ] Ctrl+C still aborts the wait cleanly
- [ ] Pressing P during rate limit wait enters the regular manual pause flow; resuming from pause continues the remaining wait
- [ ] Safety buffers (30s / 60s) preserved
- [ ] Fallback wait for unknown reset time still works
- [ ] TypeScript compiles cleanly (`tsc --noEmit`)

## Notes
- The `onTick` callback in `rate-limit-waiter.ts` was the mechanism for the countdown display — removing it simplifies the API to just returning a Promise that resolves when the wait is over.
- Check if `formatTimeRemaining` helper can be removed if it's only used for the countdown.
- Investigate how the P (pause) hotkey is currently wired up during task execution in `do.ts`. The rate limit wait needs to hook into the same mechanism so that pressing P clears the timeout, runs the pause flow, and on resume restarts the wait with remaining time.
