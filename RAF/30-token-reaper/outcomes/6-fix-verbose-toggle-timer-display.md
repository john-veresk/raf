# Task 06: Fix Verbose Toggle Timer Display

## Summary

Modified the timer callback in `do.ts` to check the verbose toggle state on each tick. When verbose is toggled ON at runtime, the status line is immediately cleared and updates are skipped. When toggled back OFF, the timer resumes displaying with the accurate elapsed time.

## Changes Made

### src/commands/do.ts
- Updated the `onTick` callback (lines 915-923) to check `verboseToggle.isVerbose` on every tick
- When verbose is ON: calls `statusLine.clear()` and returns early (skipping the update)
- When verbose is OFF: updates the status line as normal with task progress
- The timer continues tracking elapsed time internally regardless of display state

### tests/unit/timer-verbose-integration.test.ts (new file)
- Created new test file with 5 tests covering the timer-verbose integration:
  - `should update status line when verbose is off`
  - `should clear status line and skip update when verbose is toggled on`
  - `should resume updating status line when verbose is toggled back off`
  - `should track elapsed time correctly regardless of verbose state`
  - `should not create timer callback when started with verbose flag`

## Acceptance Criteria Verification

- [x] Toggling verbose ON clears the status line and stops timer/task-name display
- [x] Toggling verbose OFF resumes the timer/status line with correct elapsed time
- [x] No task name prefix appears on verbose output lines (status line cleared immediately)
- [x] Starting with `--verbose` flag still works as before (no timer callback created)
- [x] Timer internally tracks elapsed time correctly regardless of display state
- [x] All existing tests pass (1167 passing; 3 pre-existing failures in validation.test.ts and claude-runner-interactive.test.ts are unrelated)

## Notes

- The fix is minimal: just 4 lines added to the existing `onTick` callback
- The `statusLine.clear()` call happens on every tick while verbose is on, which is safe because the clear operation is idempotent
- The next tick after toggling verbose OFF will immediately show the correct elapsed time since the timer tracks time independently

<promise>COMPLETE</promise>
