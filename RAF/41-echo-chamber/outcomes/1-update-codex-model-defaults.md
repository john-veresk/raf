# Outcome: Update Codex Model Defaults

## Summary
Replaced all references to the defunct `gpt-5.3-codex-spark` model with `gpt-5.3-codex` across the codebase.

## Changes Made

### `src/types/config.ts`
- `codexModels.nameGeneration`: `gpt-5.3-codex-spark` → `gpt-5.3-codex`
- `codexModels.failureAnalysis`: `gpt-5.3-codex-spark` → `gpt-5.3-codex`
- `codexEffortMapping.low`: `gpt-5.3-codex-spark` → `gpt-5.3-codex`

### `src/utils/config.ts`
- Updated comment examples (2 places)
- Updated error message examples (2 places)
- Removed `gpt-5.3-codex-spark` entry from `CODEX_MODEL_TIER_ORDER`; updated tier comment; `spark` and `codex` now both at tier 1
- Removed `gpt-5.3-codex-spark` → `'spark'` mapping from `getModelShortName`
- Updated `MODEL_ALIAS_TO_FULL_ID.spark` to point to `gpt-5.3-codex`

## Notes
- The `spark` alias is preserved but now resolves to `gpt-5.3-codex` instead of the defunct `gpt-5.3-codex-spark`
- Build passes with no TypeScript errors

<promise>COMPLETE</promise>
