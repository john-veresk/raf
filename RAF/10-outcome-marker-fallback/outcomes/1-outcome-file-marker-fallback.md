# Outcome: Outcome File Marker Fallback

## Summary

Implemented fallback logic in `do.ts` to check the outcome file for completion markers when not found in Claude's terminal output.

## Changes Made

### Modified File: `src/commands/do.ts`

Added fallback logic in the `else` block (lines 407-420) that handles unknown results from terminal output parsing:

1. **Check outcome file existence**: If no marker is found in terminal output, check if the outcome file exists
2. **Parse outcome file**: If it exists, read and parse the outcome file using `parseOutcomeStatus()`
3. **Determine success/failure**:
   - If outcome file has `<promise>COMPLETE</promise>` marker → mark task as successful
   - If outcome file has `<promise>FAILED</promise>` marker → mark task as failed with reason "Task failed (from outcome file)"
   - If outcome file exists but has no marker → set failure reason to "No completion marker found in output or outcome file"
4. **Handle missing outcome file**: If outcome file doesn't exist, keep original behavior with "No completion marker found" failure reason

## Acceptance Criteria Verification

- [x] When Claude writes `<promise>COMPLETE</promise>` to outcome file but not terminal output, task is marked successful
- [x] When Claude writes `<promise>FAILED</promise>` to outcome file but not terminal output, task is marked failed
- [x] When marker is in terminal output, behavior is unchanged (terminal takes precedence)
- [x] When marker is in neither location, task fails with clear message
- [x] All existing tests pass (544 tests passed)

## Notes

- The `parseOutcomeStatus` function was already imported (line 27) and returns `'completed'`, `'failed'`, or `null`
- The `outcomeFilePath` variable was already computed at line 332
- Terminal output check remains first for backwards compatibility

<promise>COMPLETE</promise>
