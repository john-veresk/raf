# Task Outcome: Update default effortMapping to use opus for medium tasks

## Summary

Successfully updated the default `effortMapping.medium` configuration from `"sonnet"` to `"opus"` across the entire codebase. This change ensures medium-effort tasks now execute with Opus by default for better quality on moderately complex work.

## Changes Made

### Configuration Files
- **src/types/config.ts**: Changed `DEFAULT_CONFIG.effortMapping.medium` from `'sonnet'` to `'opus'`

### Documentation Files
- **src/prompts/config-docs.md**: Updated effortMapping table to show `medium: "opus"` as the default
- **src/prompts/config-docs.md**: Updated example effortMapping config and ceiling behavior explanation
- **CLAUDE.md**: Updated the effortMapping example in "Per-Task Model Resolution" section

### Test Files
- **tests/unit/config.test.ts**: Updated 5 test assertions to expect `medium: 'opus'` instead of `medium: 'sonnet'`
- **tests/unit/config-command.test.ts**: Updated 2 test assertions to expect the new default

## Verification

All tests pass successfully:
- Test Suites: 51 passed
- Tests: 1257 passed
- No failures or errors

## Acceptance Criteria Met

- [x] `DEFAULT_CONFIG.effortMapping.medium` is `"opus"`
- [x] `src/prompts/config-docs.md` reflects the new defaults
- [x] `CLAUDE.md` reflects the new defaults
- [x] All tests pass with `npm test`

<promise>COMPLETE</promise>
