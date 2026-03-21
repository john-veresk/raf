# Outcome: Update Git Commit Instructions

## Summary

Updated the task execution prompt to commit only files related to the current task instead of using `git add -A` which staged all changes including unrelated files.

## Key Changes

**File modified**: `src/prompts/execution.ts` (lines 89-104)

**Before**:
```
1. Stage all changes with `git add -A`
   - This includes any new plan files in the `plans/` folder
```

**After**:
```
1. Stage only the files you modified during this task:
   - Add each code file you changed: `git add <file1> <file2> ...`
   - Add the outcome file: `git add ${outcomeFilePath}`
   - Add this task's plan file: `git add ${planPath}`
```

## Acceptance Criteria Verification

- [x] `git add -A` is no longer used in the execution prompt
- [x] Instructions clearly tell Claude to add only modified files
- [x] Outcome file path is explicitly included in staging instructions
- [x] Plan file path for the current task is explicitly included
- [x] All existing tests pass (733 tests passed)

## Notes

- The `planPath` and `outcomeFilePath` variables were already available in the function scope, so no additional code changes were needed
- This is a prompt text change only - no structural code changes

<promise>COMPLETE</promise>
