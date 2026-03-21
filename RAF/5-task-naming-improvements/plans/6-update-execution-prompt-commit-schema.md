# Task: Update Execution Prompt for Universal Task Commit Schema

## Objective
Update the execution prompt to instruct Claude to use the universal commit schema format for task commits.

## Context
RAF uses a universal commit schema for all commits. While plan and outcome commits are handled programmatically by RAF (task 005), task commits are made by Claude during execution. The execution prompt needs to be updated to use the new format:

`RAF[<project-number>:<task-number>] <project-name> <task-name>`

Example: `RAF[005:001] task-naming-improvements enhance-identifier-resolution`

This task depends on the commit schema defined in task 005.

## Requirements
- Update `src/prompts/execution.ts` to use the new commit message format
- The execution prompt params must include:
  - Project number (e.g., "005")
  - Task number (e.g., "001")
  - Project name (e.g., "task-naming-improvements")
  - Task name (e.g., "enhance-identifier-resolution")
- The commit message should follow format: `RAF[<project-number>:<task-number>] <project-name> <task-name>`
- Update the `do.ts` command to pass the required parameters to the execution prompt

## Implementation Steps
1. Read the current execution prompt in `src/prompts/execution.ts`
2. Update `ExecutionPromptParams` interface to include:
   - `projectNumber: string` (e.g., "005")
   - `taskName: string` (e.g., "enhance-identifier-resolution")
   - Ensure `projectName` is required (not optional)
3. Update the `commitInstructions` section in `getExecutionPrompt` to use format:
   ```
   Commit with message: "RAF[${projectNumber}:${taskNumber}] ${projectName} ${taskName}"
   ```
   Note: `taskNumber` should be zero-padded (e.g., "001")
4. Read the `do.ts` command implementation
5. Update the call to `getExecutionPrompt` to pass:
   - `projectNumber` extracted from the project folder name (e.g., "005" from "005-task-naming-improvements")
   - `taskName` extracted from the task file name (e.g., "enhance-identifier-resolution" from "001-enhance-identifier-resolution.md")
6. Add or update tests for:
   - Execution prompt generates correct commit format
   - Parameters are correctly passed from do command

## Acceptance Criteria
- [ ] `ExecutionPromptParams` includes `projectNumber` and `taskName` fields
- [ ] Execution prompt instructs Claude to use format `RAF[005:001] project-name task-name`
- [ ] `do.ts` extracts and passes project number from folder name
- [ ] `do.ts` extracts and passes task name from plan file name
- [ ] Task number is zero-padded in commit message (001, 002, etc.)
- [ ] Tests verify correct commit message format in prompt
- [ ] All existing tests pass

## Notes
- The project number can be extracted from the project folder name (first 3 digits or base36 prefix)
- The task name is the kebab-case portion after the task number in the plan filename
- Example extraction: `005-task-naming-improvements/plans/001-enhance-identifier-resolution.md`
  - Project number: `005`
  - Task number: `001` (from `taskNumber` param, zero-padded)
  - Project name: `task-naming-improvements`
  - Task name: `enhance-identifier-resolution`
