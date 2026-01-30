# Task: Fix Timeout Label

## Objective
Change the startup message label from "Timeout" to "Task timeout" for clarity.

## Context
When `raf do` starts executing a project, it displays a summary message showing the number of tasks and the timeout value. The current label "Timeout" is ambiguous - changing it to "Task timeout" makes it clearer that this timeout applies per-task, not for the entire project.

## Requirements
- Change the label from "Timeout" to "Task timeout" in the `raf do` startup message
- Keep the rest of the message format unchanged: `Tasks: X, Task timeout: Y minutes`

## Implementation Steps
1. Open `src/commands/do.ts`
2. Find line 227 with the logger.info call
3. Change `Timeout:` to `Task timeout:`

## Acceptance Criteria
- [ ] The message displays "Task timeout:" instead of "Timeout:"
- [ ] The rest of the message format remains unchanged
- [ ] All existing tests pass

## Notes
This is a simple label change in `src/commands/do.ts:227`:
```typescript
// Before:
logger.info(`Tasks: ${state.tasks.length}, Timeout: ${timeout} minutes`);

// After:
logger.info(`Tasks: ${state.tasks.length}, Task timeout: ${timeout} minutes`);
```
