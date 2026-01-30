## Status: SUCCESS

# Task 006 - Completed

## Summary
## Summary
I have successfully completed Task 006: Update Execution Prompt for Universal Task Commit Schema.
### Changes Made
**1. `src/prompts/execution.ts`** - Updated execution prompt:
- Added `projectNumber: string` field to `ExecutionPromptParams` interface (required)
- Added `taskName: string` field to `ExecutionPromptParams` interface (required)
- Made `projectName` required (removed optional `?`)
- Added zero-padding for task number (3 digits)
- Updated commit message format to: `RAF[${projectNumber}:${paddedTaskNumber}] ${projectName} ${taskName}`
**2. `src/commands/do.ts`** - Updated do command:
- Added extraction of `projectNumber` using `extractProjectNumber(projectPath)`
- Updated `getExecutionPrompt()` call to pass `projectNumber` and `taskName`
- Task name is extracted from plan file using `extractTaskNameFromPlanFile(task.planFile)`
**3. `tests/unit/execution-prompt.test.ts`** - New test file with 19 tests:
- Tests for RAF commit schema format in prompt
- Tests for zero-padding of single, double, and triple digit task numbers
- Tests for base36 project numbers
- Tests for task name and project name in commit message
- Tests for autoCommit=false case
- Tests for various commit message combinations
- Tests for task information, outcome file notes, and previous outcomes
### Acceptance Criteria Verification
- ✅ `ExecutionPromptParams` includes `projectNumber` and `taskName` fields
- ✅ Execution prompt instructs Claude to use format `RAF[005:001] project-name task-name`
- ✅ `do.ts` extracts and passes project number from folder name
- ✅ `do.ts` extracts and passes task name from plan file name
- ✅ Task number is zero-padded in commit message (001, 002, etc.)
- ✅ Tests verify correct commit message format in prompt
- ✅ All existing tests pass (391 tests total)
<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Elapsed time: 2m 55s
- Completed at: 2026-01-30T22:29:34.246Z
