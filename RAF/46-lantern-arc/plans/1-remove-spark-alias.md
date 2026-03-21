---
effort: low
---
# Task: Remove spark alias

## Objective
Remove the incorrect `spark` model alias that maps to `gpt-5.3-codex` from the entire codebase.

## Context
The `spark` alias in the RAF codebase incorrectly maps to `gpt-5.3-codex`. This alias should be removed entirely rather than remapped.

## Requirements
- Remove `spark` from the `CodexModelAlias` type union
- Remove `spark` from `VALID_CODEX_MODEL_ALIASES` array
- Remove `spark` from `MODEL_ALIAS_TO_FULL_ID` mapping
- Remove `spark` from codex model tier ordering
- Remove `spark` from any recognition/resolution logic
- Remove `spark` from `config-docs.md` documentation
- Verify no other files reference the spark alias

## Implementation Steps
1. In `src/types/config.ts`:
   - Remove `'spark'` from `CodexModelAlias` type (line ~8)
   - Remove `'spark'` from `VALID_CODEX_MODEL_ALIASES` array (line ~129)
2. In `src/utils/config.ts`:
   - Remove `spark` entry from `MODEL_ALIAS_TO_FULL_ID` (line ~577)
   - Remove `spark` from codex tier ordering (line ~453)
   - Remove spark from alias recognition logic (line ~547)
   - Clean up any comments mentioning spark
3. In `src/prompts/config-docs.md`:
   - Remove the `"spark"` documentation entry (line ~212)
4. Search for any remaining `spark` references and remove them

## Acceptance Criteria
- [ ] `spark` does not appear in any TypeScript source files as a model alias
- [ ] `spark` does not appear in config-docs.md
- [ ] TypeScript compiles without errors
- [ ] Remaining codex aliases (`codex`, `gpt54`) still work correctly
