# Outcome: Support Full Model IDs in Config

## Summary

Added support for full Claude model IDs (e.g., `claude-opus-4-5-20251101`) in the RAF config system, alongside the existing short aliases (`sonnet`, `haiku`, `opus`).

## Changes Made

### `src/types/config.ts`
- Added `ClaudeModelAlias` type for short names (`sonnet | haiku | opus`)
- Widened `ClaudeModelName` to accept both short aliases and full model IDs via branded string intersection
- Added `FULL_MODEL_ID_PATTERN` regex: `/^claude-[a-z]+-\d+(-\d+)*$/`
- Added `VALID_MODEL_ALIASES` constant (replacing `VALID_MODELS` which is kept as deprecated alias)

### `src/utils/config.ts`
- Added `isValidModelName()` function that checks against both short aliases and the full model ID regex
- Updated model validation in `validateConfig()` to use `isValidModelName()`
- Updated error message to mention both short aliases and full model ID format

### `src/utils/validation.ts`
- Updated `validateModelName()` to accept full model IDs
- Updated `resolveModelOption()` return type to `ClaudeModelName`
- Updated error message to include full model ID example
- Deprecated `ValidModelName` type alias in favor of `ClaudeModelName`

### `src/prompts/config-docs.md`
- Updated model value description to mention full model IDs
- Updated validation rules to describe the new pattern
- Added "Pinned Model Versions" example config section

### `tests/unit/config.test.ts`
- Added `isValidModelName` tests: short aliases, full model IDs, and invalid strings
- Added `validateConfig` tests for full model IDs (with and without date suffix)
- Added `validateConfig` test for rejecting random strings
- Added `resolveConfig` test for deep-merging full model ID overrides

## Verification

- TypeScript build passes cleanly
- All 1066 tests pass (7 new tests added)
- 2 pre-existing test failures confirmed unrelated (same on base branch)

<promise>COMPLETE</promise>
