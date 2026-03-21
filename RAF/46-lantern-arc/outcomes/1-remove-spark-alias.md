# Outcome: Remove spark alias

## Summary
Removed the `spark` model alias from the codebase. It incorrectly mapped to `gpt-5.3-codex` and has been eliminated entirely.

## Changes Made
- `src/types/config.ts`: Removed `'spark'` from `CodexModelAlias` type and `VALID_CODEX_MODEL_ALIASES` array
- `src/utils/config.ts`: Removed `spark` from `MODEL_ALIAS_TO_FULL_ID`, `CODEX_MODEL_TIER_ORDER`, alias recognition condition, and updated JSDoc comment
- `src/prompts/config-docs.md`: Removed `spark` row from the Codex models table; updated `codex` row description

## Verification
- No remaining `spark` references in `src/`
- TypeScript compiles without errors
- `codex` and `gpt54` aliases remain intact

<promise>COMPLETE</promise>
