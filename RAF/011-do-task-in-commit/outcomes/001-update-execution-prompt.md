# Task 001: Update Execution Prompt

## Summary

Updated the execution prompt to instruct Claude to write meaningful commit messages describing what was accomplished, instead of using a fixed project-name + task-name format.

## Changes Made

### Files Modified

1. **src/prompts/execution.ts**
   - Removed `projectName` and `taskName` from `ExecutionPromptParams` interface
   - Removed `projectName` and `taskName` from destructuring in `getExecutionPrompt()`
   - Updated commit instructions to use `<description>` placeholder with guidance to write meaningful descriptions

2. **src/commands/do.ts**
   - Removed `projectName` and `taskName` parameters from the `getExecutionPrompt()` call

3. **tests/unit/execution-prompt.test.ts**
   - Updated `baseParams` to remove `projectName` and `taskName`
   - Updated test expectations to check for new `<description>` format
   - Removed tests that checked for project/task name in commit message
   - Added new test to verify instructions for meaningful descriptions

### New Commit Message Format

Old format:
```
RAF[005:001] project-name task-name
```

New format:
```
RAF[005:001] <description>
   - Write a concise description of what was accomplished
   - Focus on the actual change, not the task name
```

## Acceptance Criteria Verification

- [x] Commit instructions tell Claude to write meaningful descriptions
- [x] RAF prefix `RAF[project:task]` is preserved in the format
- [x] `projectName` and `taskName` parameters removed from interface
- [x] TypeScript compiles without errors (`npm run build` passes)
- [x] No changes to other prompt sections (outcome file, retry context, etc.)
- [x] All 543 tests pass

<promise>COMPLETE</promise>
