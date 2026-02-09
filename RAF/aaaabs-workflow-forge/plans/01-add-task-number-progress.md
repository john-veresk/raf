# Task: Add Task Number to Progress Reporting

## Objective
Add [NNN] task number prefix to the "raf do" progress reporting in both spinner and completion summary.

## Context
Currently "raf do" shows task names during execution but doesn't show the task number (e.g., 001, 002). Adding the task number prefix helps users understand which specific task is running and correlate output with plan files.

## Requirements
- Display task number as [NNN] prefix (e.g., [001], [002])
- Show prefix in spinner/progress message during task execution
- Show prefix in task completion/failure summary
- Format: `[001] task-name` style

## Implementation Steps
1. Locate the progress reporting code in the "do" command
2. Extract task number from the task filename (e.g., "001" from "001-task-name.md")
3. Update spinner message format to include [NNN] prefix
4. Update completion summary format to include [NNN] prefix
5. Test with multi-task projects to verify correct numbering

## Acceptance Criteria
- [ ] Spinner shows [NNN] prefix during task execution
- [ ] Completion summary shows [NNN] prefix
- [ ] Task number correctly extracted from plan filename
- [ ] Formatting consistent across all progress messages

## Notes
- Task number comes from plan filename format: `NNN-task-name.md`
- Existing progress reporting logic is in `src/commands/do.ts` or related execution files
