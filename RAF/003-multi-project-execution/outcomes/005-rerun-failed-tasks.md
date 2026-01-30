# Task 005 - Completed

## Summary
The task is complete. Let me provide a summary:
## Task 005 Complete
### Summary
Implemented support for re-running failed and pending tasks with the `raf do` command. Users can now resume project execution from failed or pending tasks, and use `--force` to re-run all tasks.
### Changes Made
1. **Updated `src/types/config.ts`**:
   - Added `force?: boolean` to `DoCommandOptions` interface
2. **Updated `src/commands/do.ts`**:
   - Added `-f, --force` flag to re-run all tasks regardless of status
   - Changed from `getNextPendingTask` to `getNextExecutableTask` for task selection
   - Implemented force mode that tracks tasks completed in the current session
   - Added console output indicating task status:
     - "Retrying task X (previously failed)..." for failed tasks
     - "Re-running task X (force mode)..." for completed tasks with --force
     - "Executing task X..." for pending tasks
   - Updated "project complete" message to suggest `--force` flag
   - Track completed tasks in session for force mode iteration
3. **Created `tests/unit/do-rerun.test.ts`**:
   - 11 tests covering all rerun scenarios:
     - Skip completed tasks
     - Retry failed tasks
     - Run pending tasks
     - Handle malformed outcome files
     - All complete detection
     - Force mode task selection
     - Task status logging
### Acceptance Criteria Met
- ✅ `raf do project-name` skips tasks with SUCCESS outcome
- ✅ `raf do project-name` retries tasks with FAILED outcome
- ✅ `raf do project-name` runs tasks without outcome files
- ✅ `--force` flag runs all tasks regardless of status
- ✅ Clear console output indicates skip/retry/run status
- ✅ All tests pass (196 tests)
<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Elapsed time: 3m 1s
- Completed at: 2026-01-30T18:16:20.525Z

