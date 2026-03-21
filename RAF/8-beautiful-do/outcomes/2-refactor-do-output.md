# Task 002: Refactor Do Command Output - Outcome

## Summary

Refactored the `do` command to use ultra-minimal, single-line progress display with in-place updates. The new design shows only essential information: symbol + task name + timer, with clean transformation from running to complete/failed states.

## Key Changes

### Files Modified

1. **`src/commands/do.ts`**
   - Added imports for `SYMBOLS`, `formatProjectHeader`, `formatSummary`, `formatTaskProgress` from terminal-symbols
   - Added project-level timer tracking (`projectStartTime`)
   - Normal mode now shows:
     - Project header: `▶ my-project (5 tasks)`
     - During execution: `● implementing-auth 1:23` (updates in place)
     - On completion: `✓ implementing-auth 2:34`
     - On failure: `✗ implementing-auth 2:34`
     - Final summary: `✓ 5/5 completed in 12:34`
   - Verbose mode (`--verbose`) preserves all detailed output
   - Model info hidden in normal mode (only with `--verbose`)
   - Retry messages hidden in normal mode
   - Multi-project summary minimized: `✓ project-name` or `✗ project-name`

2. **`src/utils/terminal-symbols.ts`**
   - Updated `formatTaskProgress()` to show elapsed time for all statuses (not just running)
   - This enables showing `✓ task-name 2:34` on completion

3. **`tests/unit/terminal-symbols.test.ts`**
   - Added tests for completed and failed tasks with elapsed time
   - Total tests increased from 28 to 30

### Output Examples

**Normal mode (default):**
```
▶ my-project (3 tasks)
● auth-login 0s        ← updates in place
✓ auth-login 1m 23s    ← replaces running line
● setup-db 0s
✓ setup-db 45s
● deploy 0s
✓ deploy 2m 10s
✓ 3/3 completed in 4m 18s
```

**Verbose mode (`--verbose`):**
```
Executing project: my-project
Tasks: 3, Task timeout: 60 minutes
Using model: claude-opus-4-5-20251101

[Task 1/3: auth-login] Executing task 001...
✓ [Task 1/3: auth-login]   Task 001 completed (1m 23s)

...

✓ All tasks completed!
✓ Project complete. Committed to git.

Summary:
  Completed: 3
  Failed: 0
  Pending: 0
```

## Acceptance Criteria Met

- [x] Single-line progress updates in place during task execution
- [x] Timer visible and updating during task run
- [x] Clean transformation from running to complete/failed
- [x] No retry noise in normal mode
- [x] Summary shows single result line
- [x] `--verbose` flag still provides detailed output
- [x] All existing tests pass or are updated (484 tests pass)

## Test Results

```
Test Suites: 24 passed, 24 total
Tests:       484 passed, 484 total
```

<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Elapsed time: 2m 15s
- Completed at: 2026-01-31T11:05:30.000Z


## Details
- Attempts: 3
- Elapsed time: 6m 32s
- Completed at: 2026-01-31T11:08:14.004Z
