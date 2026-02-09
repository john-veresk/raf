# Task: Verbose Task Name Display

## Objective
Show the task name alongside the task ID in all verbose mode log messages (e.g., "Executing task 011 (fix-login-bug)..." instead of "Executing task 011...").

## Context
Currently in verbose mode, log messages reference tasks by ID only (e.g., "Executing task 011..."). The task name is available via `extractTaskNameFromPlanFile()` and is already stored in `displayName`, but not consistently used in all log messages. Users need the task name to quickly understand what's running without cross-referencing plan files.

## Requirements
- Add task name to ALL verbose log messages that reference a task ID, including:
  - "Executing task 011..." → "Executing task 011 (fix-login-bug)..."
  - "Retrying task 011 (previously failed)..." → include name
  - "Re-running task 011 (force mode)..." → include name
  - "Task 011 completed (2m 30s)" → include name
  - "Task 011 failed: reason (2m 30s)" → include name
  - "Task 011 blocked by failed dependency: 003" → include name
  - Retry messages
  - Changes stashed messages
- The task name is already computed as `displayName` in `do.ts` — use it consistently
- Also update the `logger.setContext()` call if it's being used (currently no-op but may be restored)
- Update the verbose summary section to include task names where applicable

## Implementation Steps
1. Read `src/commands/do.ts` and identify all verbose log messages that reference task IDs
2. Update each message to include `displayName` in parentheses after the task ID
3. Ensure the format is consistent: `task ${task.id} (${displayName})` everywhere
4. Update tests if any test verbose output format

## Acceptance Criteria
- [ ] All verbose log messages that mention a task ID also show the task name
- [ ] Format is consistent across all messages
- [ ] Non-verbose mode is unaffected
- [ ] All tests pass

## Notes
- `displayName` is already computed at line 447 of `do.ts` as `taskName ?? task.id`
- When `displayName` equals `task.id` (name extraction failed), showing it in parens would be redundant — consider only showing parens when name differs from ID
- The `setContext` and `clearContext` methods on logger are currently no-ops (deprecated) but the calls remain in do.ts
