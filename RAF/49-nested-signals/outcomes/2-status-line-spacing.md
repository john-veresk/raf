# Outcome: Add space between status line and error message in retry case

## Summary

Fixed the visual glitch where warning/error messages appeared glued to the status line text by making the logger status-line-aware (Option A from the plan).

## Key Changes

- **`src/utils/logger.ts`**: Added `setActiveStatusLine(statusLine)` method and `clearStatusLine()` helper to the `Logger` class. `warn()`, `error()`, and `info()` now call `clearStatusLine()` before writing output, so any active status line is properly cleared first.
- **`src/commands/do.ts`**: Calls `logger.setActiveStatusLine(statusLine)` after creating the status line, and `logger.setActiveStatusLine(null)` after clearing it at task completion.

## Result

Warning messages (context overflow, timeout, etc.) now appear on their own line rather than being appended to the status line text. The status line resumes updating correctly after each warning via the existing timer callback.

<promise>COMPLETE</promise>
