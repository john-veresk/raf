# Task Outcome: Change default effortMapping.low from haiku to sonnet

## Summary

Successfully updated the default model for low-effort tasks from `haiku` to `sonnet` across the entire codebase.

## Changes Made

### 1. Core Configuration
- **src/types/config.ts**: Changed `DEFAULT_CONFIG.effortMapping.low` from `'haiku'` to `'sonnet'` (line 72)

### 2. Documentation
- **src/prompts/config-docs.md**: Updated all references to the low-effort default:
  - Table default value (line 52)
  - Example JSON configuration (line 64)
  - Example explanation (line 67)
  - Full configuration example (line 220)

- **CLAUDE.md**: Updated effortMapping description (line 173) to reflect new default

### 3. Test Files
Updated all test assertions that checked for the old default value:

- **tests/unit/config.test.ts**: 7 test assertions updated
  - Line 94: Full config validation test
  - Line 277: Deep-merge test
  - Line 371: Config resolution test
  - Line 404: Default config test
  - Line 487: Effort mapping default test
  - Line 599: Custom effort mapping test
  - Line 714: Effort resolution test
  - Line 724: Valid effortMapping test

- **tests/unit/config-command.test.ts**: 1 test assertion updated
  - Line 80: Effort mapping override test

### 4. Verification
- All 1243 tests passed successfully
- TypeScript compilation passed with no errors (`npm run lint`)
- No references to the old default remain in the codebase

## Notes

- Did NOT change `models.failureAnalysis: 'haiku'` or any other haiku references outside of `effortMapping.low` (as required)
- No updates needed in `tests/unit/claude-runner.test.ts` (no effortMapping.low references found)
- Planning prompts (`src/prompts/planning.ts`) only describe effort levels conceptually without mentioning specific models, so no changes were needed there

## Verification

All acceptance criteria met:
- ✅ `DEFAULT_CONFIG.effortMapping.low` equals `'sonnet'`
- ✅ All documentation references updated (config-docs.md, CLAUDE.md)
- ✅ All test assertions updated and passing
- ✅ `npm test` passes with no failures (1243/1243 tests passed)
- ✅ `npm run lint` passes

<promise>COMPLETE</promise>
