# Task: Fix TypeError on Shutdown

## Objective
Fix the error `TypeError: this.activeProcess.write is not a function` that occurs during shutdown/cancel operations.

## Context
When pressing Ctrl+C or during cleanup, the application throws an unhandled rejection error. This likely occurs in `shutdown-handler.ts` or `claude-runner.ts` when trying to write to an already-closed or null process.

## Requirements
- Fix the error that occurs on shutdown/cancel (Ctrl+C)
- Handle the case where `activeProcess` is null or doesn't have a `write` method
- Ensure graceful shutdown still works correctly
- No changes to normal operation flow

## Implementation Steps
1. Locate the error source - likely in `src/core/shutdown-handler.ts` or `src/core/claude-runner.ts`
2. Check `claude-runner.ts` for the `killProcess()` method that sends Ctrl+C via `write('\x03')`
3. Add null check before calling `write()` on the process
4. Verify `activeProcess` is a valid PTY instance with write method before calling
5. Add try-catch around the write operation for safety
6. Test shutdown scenarios

## Acceptance Criteria
- [ ] No error thrown when pressing Ctrl+C during plan or do phase
- [ ] No error on normal process completion
- [ ] Graceful shutdown still kills Claude process properly
- [ ] All existing tests pass

## Notes
- The error suggests `activeProcess` might be set to something without a `write` method
- Check if there's a race condition where process is replaced or cleared during shutdown
- Consider checking `typeof this.activeProcess.write === 'function'` before calling
- Look at both PTY (interactive) and spawn (non-interactive) code paths
