# Outcome: Add Task Number to Progress Reporting

## Summary

Added [NNN] task number prefix to the "raf do" progress reporting in both spinner and completion summary.

## Changes Made

### Files Modified

1. **src/utils/terminal-symbols.ts**
   - Added optional `taskId` parameter to `formatTaskProgress` function
   - Modified output format to include `[NNN]` prefix when task ID is provided
   - Updated JSDoc to reflect new parameter and output format

2. **src/commands/do.ts**
   - Added `taskId` variable capture for closure in timer callback
   - Updated all 4 calls to `formatTaskProgress` to pass task ID:
     - Blocked task display (line 462)
     - Running spinner update (line 519)
     - Completed task display (line 670)
     - Failed task display (line 690)

3. **tests/unit/terminal-symbols.test.ts**
   - Added 4 new tests for task ID prefix functionality:
     - Running task with task ID prefix
     - Completed task with task ID prefix and elapsed time
     - Blocked task with task ID prefix
     - Failed task with task ID prefix and elapsed time

## Output Examples

Before:
```
● auth-login 1m 23s
✓ setup-db 2m 34s
✗ deploy 45s
⊘ depends-on-failed 2/5
```

After:
```
● [001] auth-login 1m 23s
✓ [002] setup-db 2m 34s
✗ [003] deploy 45s
⊘ [004] depends-on-failed 2/5
```

## Acceptance Criteria

- [x] Spinner shows [NNN] prefix during task execution
- [x] Completion summary shows [NNN] prefix
- [x] Task number correctly extracted from plan filename
- [x] Formatting consistent across all progress messages

## Test Results

- All 747 tests pass
- Build succeeds with no TypeScript errors

<promise>COMPLETE</promise>
