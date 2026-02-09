# Outcome: Implement Dependency Checking in `raf do`

## Summary

Updated the `raf do` command to detect blocked tasks and automatically create blocked outcome files instead of attempting execution. When a task's dependencies fail, the task is marked as blocked and skipped, with a proper outcome file generated explaining which dependencies caused the block.

## Key Changes

### 1. Updated Terminal Symbols (`src/utils/terminal-symbols.ts`)

- **Added `blocked` symbol**: `⊘` for blocked tasks
- **Updated `TaskStatus` type**: Added `'blocked'` to union type
- **Updated `formatSummary()`**:
  - Added optional `blocked` parameter (default 0)
  - Summary now shows blocked count separately: "3/5 (1 failed, 2 blocked)"
  - Blocked counts are included in the total

### 2. Updated Do Command (`src/commands/do.ts`)

**New Function: `getNextTaskToProcess()`**
- Replaces `getNextTask()` to handle blocked tasks
- First checks for blocked tasks that need outcome files generated
- Then returns next executable task (pending or failed)

**New Function: `generateBlockedOutcome()`**
- Creates structured blocked outcome file content
- Lists failed and blocked dependencies
- Includes resolution instructions
- Ends with `<promise>BLOCKED</promise>` marker

**Task Loop Updates**
- Detects blocked tasks and handles them separately
- Skips Claude execution for blocked tasks entirely
- Generates blocked outcome file via `projectManager.saveOutcome()`
- Shows console output: "Task X blocked by failed dependency: Y"
- Re-derives state after each blocked task to cascade blocking

**Summary Output Updates**
- Verbose mode: Shows blocked count in summary
- Minimal mode: Passes blocked count to `formatSummary()`

### 3. New Tests (`tests/unit/do-blocked-tasks.test.ts`)

Added 12 new tests covering:
- Blocked task detection when dependency fails
- Cascading blocking through multiple tasks
- Non-blocking when dependency succeeds
- Blocking with multiple dependencies (one fails)
- `getNextExecutableTask` skipping blocked tasks
- `getDerivedStats` counting blocked separately
- `isProjectComplete` with blocked tasks
- `hasProjectFailed` distinguishing blocked from failed
- BLOCKED marker recognition in outcome files

### 4. Updated Terminal Symbols Tests (`tests/unit/terminal-symbols.test.ts`)

- Added test for `blocked` symbol
- Updated SYMBOLS test to include `blocked`
- Added tests for `formatTaskProgress` with blocked status
- Added tests for `formatSummary` with blocked tasks (single, multiple, combined with failures)
- Added test for `formatProgressBar` with blocked status

## Blocked Outcome File Format

```markdown
# Outcome: Task 002 Blocked

## Summary

This task was automatically blocked because one or more of its dependencies failed or are blocked.

## Blocking Dependencies

**Failed dependencies**: 001
**Blocked dependencies**: (if any)

**Task dependencies**: 001

## Resolution

To unblock this task:
1. Fix the failed dependency task(s)
2. Re-run the project with `raf do`

<promise>BLOCKED</promise>
```

## Files Modified

- `src/commands/do.ts` - Main implementation
- `src/utils/terminal-symbols.ts` - Blocked symbol and formatSummary updates
- `tests/unit/do-blocked-tasks.test.ts` - New test file (12 tests)
- `tests/unit/terminal-symbols.test.ts` - Updated tests for blocked status

## Acceptance Criteria Verification

- [x] Blocked tasks are detected and skipped
- [x] Blocked outcome file created with proper format and BLOCKED marker
- [x] Console shows clear blocked message with dependency info
- [x] Blocking cascades properly (if 001 fails, 002 blocked, 003 depends on 002 also blocked)
- [x] Summary shows blocked tasks separately from failed
- [x] No Claude execution attempted for blocked tasks

## Test Results

- All 677 tests pass
- 12 new tests for blocked task handling
- 6 updated tests for terminal symbols

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 4m 20s
- Completed at: 2026-01-31T16:46:46.254Z
