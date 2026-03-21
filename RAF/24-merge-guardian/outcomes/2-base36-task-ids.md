# Outcome: Change Task IDs to 2-Character Base36 Format

## Summary

Changed task IDs from 3-digit decimal (001, 002, ..., 999) to 2-character base36 (01, 02, ..., 0a, ..., zz) across the entire codebase, supporting up to 1296 tasks per project.

## Changes Made

### Core Utilities (`src/utils/paths.ts`)
- Added `TASK_ID_WIDTH = 2` constant
- Added `TASK_ID_PATTERN = '[0-9a-z]{2}'` exported regex pattern
- Added `encodeTaskId(num)` function: converts number to 2-char zero-padded base36 string
- Added `decodeTaskId(str)` function: converts 2-char base36 string back to number (returns null if invalid)
- Updated `extractTaskNameFromPlanFile` regex from `\d{2,3}` to `[0-9a-z]{2}`

### State Derivation (`src/core/state-derivation.ts`)
- Updated `parseDependencies` filter to use `TASK_ID_PATTERN` regex
- Updated outcome file and plan file parsing regexes from `\d{2,3}` to `TASK_ID_PATTERN`

### Project Manager (`src/core/project-manager.ts`)
- Updated `readOutcomes` regex to use `TASK_ID_PATTERN`

### Plan Command (`src/commands/plan.ts`)
- Updated `maxTaskNumber` calculation to use `decodeTaskId()` instead of `parseInt()`
- Updated new plan file detection regex to use `TASK_ID_PATTERN` and `decodeTaskId()`
- Updated amend template task numbering to use `encodeTaskId()`

### Prompt Templates
- **execution.ts**: Changed commit message format from 3-digit padStart to 2-char base36 encoding
- **planning.ts**: Updated all plan file examples (001 -> 01), dependency format examples (001, 002 -> 01, 02), numbering rule (001, 002, 003 -> 01, 02, 03)
- **amend.ts**: Updated all task numbering to use `encodeTaskId()`, updated dependency format examples

### Comments Updated
- **claude-runner.ts**: Updated commit message examples (RAF[005:001] -> RAF[005:01])
- **git.ts**: Updated stash name example

### Documentation (`CLAUDE.md`)
- Updated project structure examples to show 2-char task IDs
- Added "Task ID Format" section to architectural decisions
- Updated dependencies format and git commit examples

### Test Files (25+ files updated)
All test fixtures updated to use 2-char base36 task IDs in plan/outcome filenames, task ID assertions, dependency strings, commit messages, and prompt expectations. Key patterns changed:
- Plan filenames: `001-task.md` -> `01-task.md`
- Task IDs: `'001'` -> `'01'`
- Commit messages: `RAF[005:001]` -> `RAF[005:01]`
- Dependencies: `001, 002` -> `01, 02`

## Test Results

- All 853 tests pass (42 test suites)
- Build succeeds with no type errors
- No regressions

<promise>COMPLETE</promise>
