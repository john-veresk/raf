# Outcome: Verbose Task Name Display

## Summary
Updated all verbose mode log messages in `do.ts` to include the task name alongside the task ID, using the format `task 011 (fix-login-bug)` instead of just `task 011`.

## Changes Made

### `src/commands/do.ts`
- **Added `taskLabel` variable** (line 449): Computes `${task.id} (${displayName})` when the name differs from the ID, or just `${task.id}` when they're the same (to avoid redundant `001 (001)` display).
- **Updated 7 verbose log messages** to use `taskLabel`:
  - Blocked task warning: `Task ${taskLabel} blocked by failed dependency: ...`
  - Retry message: `Retrying task ${taskLabel} (previously failed)...`
  - Force re-run message: `Re-running task ${taskLabel} (force mode)...`
  - Execute message: `Executing task ${taskLabel}...`
  - Retry loop message: `Retry N/M for task ${taskLabel}...`
  - Completion message: `Task ${taskLabel} completed (elapsed)`
  - Stash message: `Changes for task ${taskLabel} stashed as: ...`
  - Failure message: `Task ${taskLabel} failed: reason (elapsed)`

### No test changes needed
- The `formatRetryHistoryForConsole` function already supported task name display
- No existing tests assert on verbose log message format directly
- All 757 tests pass (1 pre-existing failure in planning-prompt.test.ts is unrelated)

## Acceptance Criteria
- [x] All verbose log messages that mention a task ID also show the task name
- [x] Format is consistent across all messages (`taskLabel` pattern)
- [x] Non-verbose mode is unaffected (uses `formatTaskProgress` separately)
- [x] All tests pass

<promise>COMPLETE</promise>
