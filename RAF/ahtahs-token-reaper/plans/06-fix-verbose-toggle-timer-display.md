# Task: Fix Verbose Toggle Timer Display

## Objective
Stop the interactive timer and task-name prefix from displaying when verbose mode is toggled ON, and resume them when toggled OFF.

## Context
When a user presses Tab during task execution to toggle verbose ON, the timer/status line continues updating and gets interleaved with Claude's streamed output. This produces garbled lines like:
```
● 01-extend-token-tracker-data-model 39sNow let me add the accumulateUsage() function.
```
The timer callback and status line need to be aware of the verbose toggle state so they pause/clear when verbose is ON and resume when verbose is OFF.

## Requirements
- When verbose toggles ON mid-execution: immediately clear the status line and stop timer display updates
- When verbose toggles OFF mid-execution: resume the timer/status line from the actual elapsed time (no reset)
- When started with `--verbose` flag: current behavior is already correct (no timer callback) — preserve this
- No task name or timer shown at all while verbose output is streaming — no header line either
- Tool use descriptions (→ Reading file.ts) and Claude text output continue to display normally when verbose is ON
- The timer itself keeps counting internally regardless of display state (elapsed time stays accurate)

## Implementation Steps
1. Read the current timer callback setup in `do.ts` where `createTaskTimer` is called — understand how the `onTick` callback currently works
2. Read `verbose-toggle.ts` to understand the toggle mechanism and its `isVerbose` property
3. Modify the timer's `onTick` callback to check `verboseToggle.isVerbose` on each tick — if verbose is ON, clear the status line and skip the update; if OFF, render the status line as normal
4. Ensure the status line is cleared immediately when verbose toggles ON (so the last timer line doesn't linger above the verbose output). This may require hooking into the toggle event or simply having the next tick handle it
5. Verify that toggling OFF restores the status line with the correct elapsed time on the next tick
6. Add tests for the new behavior: timer callback respects verbose state, status line cleared on verbose ON, resumed on verbose OFF

## Acceptance Criteria
- [ ] Toggling verbose ON clears the status line and stops timer/task-name display
- [ ] Toggling verbose OFF resumes the timer/status line with correct elapsed time
- [ ] No task name prefix appears on verbose output lines
- [ ] Starting with `--verbose` flag still works as before (no timer at all)
- [ ] Timer internally tracks elapsed time correctly regardless of display state
- [ ] All existing tests pass

## Notes
- The key files are `src/commands/do.ts` (timer callback setup around line 914), `src/utils/status-line.ts`, `src/utils/timer.ts`, and `src/utils/verbose-toggle.ts`
- The fix is likely a small change to the `onTick` callback — check `verboseToggle.isVerbose` and conditionally clear/update the status line
- Be careful with the edge case where `verbose` is the initial flag (no toggle exists) vs. runtime toggle via Tab
