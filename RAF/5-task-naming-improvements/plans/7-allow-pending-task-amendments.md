# Task: Allow Amending PENDING Tasks in Amend Mode

## Objective
Update the amend prompt to allow modifying PENDING (not yet executed) tasks, while still protecting COMPLETED tasks from changes.

## Context
Currently, the amend prompt instructs Claude to "NEVER modify existing plan files." However, this is overly restrictive for PENDING tasks that haven't been executed yet. Users should be able to:
- Modify PENDING tasks (they haven't been executed, so changes are safe)
- NOT modify COMPLETED tasks (their outcomes depend on the original plan)

This provides flexibility while protecting work that has already been done.

## Requirements
- Update `src/prompts/amend.ts` to differentiate between completed and non-completed tasks
- NOT COMPLETED tasks (pending or failed): Can be modified
- COMPLETED tasks: Cannot be modified (protected)
- The amend prompt should clearly communicate these rules to Claude
- The prompt should list which specific tasks are modifiable vs protected

## Implementation Steps
1. Read the current amend prompt in `src/prompts/amend.ts`
2. Update the `AmendPromptParams` interface if needed to include task status
3. Modify the existing tasks summary section to clearly indicate:
   - Which tasks are PROTECTED (completed)
   - Which tasks are MODIFIABLE (pending, failed)
4. Update the "Important Rules" section to replace:
   ```
   NEVER modify existing plan files (001-XXX)
   ```
   With something like:
   ```
   NEVER modify COMPLETED task plans - they are protected
   You MAY modify non-completed task plans (pending/failed) if the user requests changes
   ```
5. Add a new section listing modifiable vs protected tasks explicitly
6. Add tests for:
   - Prompt correctly identifies modifiable tasks
   - Prompt correctly identifies protected tasks
   - Different combinations of task statuses

## Acceptance Criteria
- [ ] Amend prompt allows modification of non-completed tasks (pending/failed)
- [ ] Amend prompt prohibits modification of COMPLETED tasks
- [ ] Prompt clearly lists which tasks are modifiable vs protected
- [ ] Status indicators are clear: [PROTECTED], [MODIFIABLE]
- [ ] Tests cover different task status combinations
- [ ] All existing tests pass

## Notes
- The task status is already available in `existingTasks` parameter
- Consider using clear visual indicators like [PROTECTED] and [MODIFIABLE] instead of just status
- This change makes the amend mode more practical while still safeguarding completed work
- Example output in prompt:
  ```
  Existing Tasks:
  - Task 001: setup-database [COMPLETED] [PROTECTED]
  - Task 002: add-user-auth [COMPLETED] [PROTECTED]
  - Task 003: implement-api [PENDING] [MODIFIABLE]
  - Task 004: write-tests [PENDING] [MODIFIABLE]
  ```
