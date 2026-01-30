## Status: SUCCESS

# Task 004 - Completed

## Summary
The task has been completed successfully. Let me summarize the implementation:
## Summary
I have successfully completed Task 004: Implement `--amend` Flag for `raf plan`.
### Changes Made
**1. `src/commands/plan.ts`** - Updated plan command:
- Added `-a, --amend <identifier>` option to Commander.js definition
- Added check when creating new project: if project name matches existing project, show error with suggestion to use `--amend`
- Implemented `runAmendCommand()` function that:
  - Resolves project using all identifier formats (number, name, full folder name)
  - Loads existing project state (tasks with completed/pending/failed status)
  - Shows warning for fully completed projects
  - Opens editor with template showing existing tasks as read-only context
  - Launches Claude with amend-specific prompt
  - Detects and reports only newly created plan files
  - Commits the changes
- Added `getAmendTemplate()` function for editor content
**2. `src/prompts/amend.ts`** - New file with amend-specific prompt:
- Includes AMENDMENT MODE instructions
- Lists existing tasks with their status ([COMPLETED], [PENDING], [FAILED])
- Instructs Claude to start numbering from next available task number
- Explicitly forbids modification of existing plan files
- Includes original input and new task description
**3. `tests/unit/plan-command.test.ts`** - New test file with 27 tests:
- Project resolution for amend (numeric ID, name, full folder name)
- Base36 project resolution for amend
- Existing project state loading (pending, completed, failed, mixed)
- Fully completed project detection
- Task name extraction
- Next task number calculation
- Amend prompt generation
- Existing project detection without amend flag
### Acceptance Criteria Verification
- ✅ `raf plan --amend 003` opens editor then launches Claude with existing task context
- ✅ `raf plan --amend 001-my-project` works with full folder name identifier
- ✅ `raf plan existing-project` (without `--amend`) shows clear error message
- ✅ Claude receives context about existing tasks and their status
- ✅ New tasks are numbered correctly (continuing from last task number)
- ✅ Warning is displayed when amending a fully completed project
- ✅ Amending creates new plan files without touching existing ones
- ✅ Tests cover the amend workflow (27 new tests)
- ✅ Help text documents the `--amend` option
### Test Results
- All 368 tests pass
- TypeScript build succeeds with no errors
<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Elapsed time: 4m 2s
- Completed at: 2026-01-30T21:32:58.833Z
