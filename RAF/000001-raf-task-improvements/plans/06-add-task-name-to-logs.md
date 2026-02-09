# Task: Add Task Name to Execution Logs

## Objective
Display task number and name in log messages during project execution, formatted as `[Task 2/5: fix-login-bug]`.

## Context
During task execution, log messages don't indicate which task they belong to. This makes it difficult to track progress and debug issues when multiple tasks run. Adding task context to logs improves clarity.

## Requirements
- Log format: `[Task X/Y: task-name]` where X is current task, Y is total tasks
- Example: `[Task 2/5: fix-login-bug]`
- Apply to relevant log messages during task execution
- Task name extracted from plan file name (e.g., `002-fix-login-bug.md` -> `fix-login-bug`)

## Implementation Steps
1. Modify `src/utils/logger.ts` to support a context prefix
2. Add method like `logger.setContext(prefix: string)` or `logger.withContext(prefix)`
3. In `src/commands/do.ts`, when starting a task:
   - Extract task name from plan file (strip number prefix and extension)
   - Format prefix as `[Task {current}/{total}: {taskName}]`
   - Set logger context with this prefix
4. Clear context when task completes
5. Update relevant log calls to include the context

## Acceptance Criteria
- [ ] Task context shown in logs during execution: `[Task 2/5: fix-login-bug]`
- [ ] Task number shows current/total (e.g., 2/5)
- [ ] Task name correctly extracted from plan filename
- [ ] Context cleared between tasks
- [ ] Doesn't affect non-task logging
- [ ] All tests pass

## Notes
- Plan files are named like `001-task-name.md`, `002-another-task.md`
- Total task count comes from `state.tasks.length`
- Current task number is `taskIndex + 1` (1-indexed for display)
- Consider whether all logs or only specific ones should show context
