---
effort: low
---
# Task: Add space between status line and error message in retry case

## Objective
Fix the visual glitch where warning messages (like "Context overflow detected") appear glued to the status line text without any spacing.

## Context
The status line in `raf do` uses `process.stdout.write(\r...)` to display in-place progress like `● 2-protocol-research-scripts (gpt-5.3-codex, high) 6m 4s`. When a warning fires from inside a runner (e.g., `logger.warn('Context overflow detected')` at codex-runner.ts:267 or claude-runner.ts:380), the warning text appears immediately after the status line text because the status line has no trailing newline. Result: `● 2-task-name (model, high) 6m 4s⚠️  Context overflow detected`.

## Dependencies
None

## Requirements
- Warning/error messages from runners must appear on a new line, visually separated from the status line
- The status line must be cleared before any log output that would appear on the same line
- This must work for all warning sources: context overflow, timeout, and any other `logger.warn` calls during task execution

## Implementation Steps
1. Read `src/utils/status-line.ts` — understand the `update()` and `clear()` methods
2. Read `src/utils/logger.ts` — understand how `warn()` and `error()` write output
3. The cleanest fix: make the logger aware of the status line. Before writing a warn/error/info message, clear the active status line (if any), then print the message:
   - Option A: Give the logger a reference to the active status line, and call `statusLine.clear()` before writing. Then the status line will be re-rendered on the next `update()` call.
   - Option B: Simpler — have the logger always write a `\n` before warning messages when stdout is a TTY. This ensures any active status line gets pushed up.
   - Option A is preferred because it properly clears the status line characters rather than just pushing them up.
4. Implement Option A:
   - Add a module-level `setActiveStatusLine(statusLine)` function in `logger.ts` (or a status-line-aware wrapper)
   - In `logger.warn()` and `logger.error()`, call `activeStatusLine?.clear()` before `console.warn()`
   - In `do.ts`, call `setActiveStatusLine(statusLine)` before the task loop, and clear it after
5. Verify the fix works for both codex-runner and claude-runner warning paths

## Acceptance Criteria
- [ ] When context overflow is detected during a running task, the warning appears on its own line below the status line
- [ ] When a timeout occurs, the timeout warning appears on its own line
- [ ] The status line resumes updating correctly after a warning is printed
- [ ] No visual artifacts (leftover characters) from the status line remain after clearing

## Notes
- The status line uses `\r` (carriage return) + space-padding to clear previous content — `clear()` already handles this correctly
- `console.warn` writes to stderr, `process.stdout.write` writes to stdout — in a terminal they're interleaved, but the visual effect is the same
- An alternative minimal fix: just add `\n` before the warn message in the runner. But this is fragile — the logger-aware approach is more robust for future warnings
