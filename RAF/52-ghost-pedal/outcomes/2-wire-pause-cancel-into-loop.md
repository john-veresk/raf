# Outcome: Wire pause and cancel into the execution loop

## Summary
Integrated `KeyboardController`'s pause and cancel states into the main task execution loop in `do.ts`. Pressing 'p' pauses between tasks, pressing 'c' stops after the current task completes.

## Key Changes
- **Added `cancelled` field** to `ProjectExecutionResult` interface
- **Cancel check** in the `while (task)` loop: after each task completes and state is re-derived, checks `keyboard.isCancelled` — if true, logs a summary line (`Cancelled — X/Y tasks completed, Z remaining`) and breaks out of the loop
- **Pause check** in the loop: after cancel check, if `keyboard.isPaused`, logs `Paused. Press P to resume...`, calls `waitForResume()`, then logs `Resumed.`
- **Cancel exit code**: when cancelled, `success` is overridden to `true` so the process exits with code 0
- **Post-actions gated**: both worktree post-actions and `pushOnComplete` now check `!result.cancelled` in addition to `result.success`
- Remaining tasks after cancel stay in their current state (pending/blocked) — not marked as failed or skipped

## Files Modified
- `src/commands/do.ts` — all changes in this single file

## Verification
- `npx tsc --noEmit` passes cleanly
- All 22 keyboard-controller unit tests pass
- No regressions introduced

<promise>COMPLETE</promise>
