# Project Decisions

## When the user presses 'p' to pause, should the currently running task continue to completion before pausing, or should it also pause/suspend the active Claude process mid-execution?
Pause between tasks — current task runs to completion, then RAF waits before starting the next task.

## When paused, how should the user resume execution?
Press 'p' again — toggle behavior, same key pauses and resumes.

## For cancel ('c'), after the current task completes and RAF stops, what should the exit code be?
Exit 0 — user intentionally stopped. The completed tasks succeeded, pending tasks can be resumed later with 'raf do'. Note: pushOnComplete/merge/PR won't fire anyway since pending > 0 means success=false, but we override to exit 0 for cancel specifically.

## Should the pause/cancel status be shown in the status line or as a standalone log message?
Standalone log line — print 'Pausing after current task...' or 'Stopping after current task...' as a regular log message that stays visible in scrollback.

## Should the VerboseToggle class be renamed since it now handles more than just verbose toggling?
Rename to KeyboardController — better reflects its expanded role handling multiple hotkeys.
