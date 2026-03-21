# Task: Update Task Status Display Format

## Objective
Change the task status display from `[01] base26-encoding` to `01-base26-encoding` to match the file naming convention.

## Context
The current terminal output shows task status as `● [01] base26-encoding 1:23` with brackets around the task ID. The user wants it to match the file naming pattern: `● 01-base26-encoding 1:23` — no brackets, dash separator between ID and name.

## Requirements
- Change the format from `[<taskId>] <name>` to `<taskId>-<name>` in the `formatTaskProgress()` function
- Update all related tests to expect the new format
- Ensure all terminal output that uses this function reflects the change

## Implementation Steps
1. In `src/utils/terminal-symbols.ts`, modify the `formatTaskProgress()` function to use `${taskId}-` instead of `[${taskId}] ` for the idPrefix
2. Update the function's JSDoc comment/return example to reflect the new format
3. Update all tests in the terminal-symbols test file to expect the new format string

## Acceptance Criteria
- [ ] Task progress lines display as `● 01-task-name` instead of `● [01] task-name`
- [ ] All tests pass with the new format
- [ ] JSDoc examples updated

## Notes
- The change is in `src/utils/terminal-symbols.ts` line 52: `const idPrefix = taskId ? `[${taskId}] ` : '';`
- Change to: `const idPrefix = taskId ? `${taskId}-` : '';`
- This affects running, completed, failed, pending, and blocked task displays
