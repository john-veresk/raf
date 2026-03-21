---
effort: low
---
# Task: Update Codex Model Defaults

## Objective
Replace the defunct `gpt-5.3-codex-spark` model with `gpt-5.4-mini` in the default Codex configuration.

## Context
The `gpt-5.3-codex-spark` model no longer exists in the Codex CLI model list. The user's Codex CLI now offers: gpt-5.4, gpt-5.4-mini, gpt-5.3-codex, gpt-5.2-codex, gpt-5.2, gpt-5.1-codex-max, gpt-5.1-codex-mini. The `gpt-5.3-codex` model should replace `gpt-5.3-codex-spark` for all lightweight/spark-tier uses.

## Requirements
- Replace all occurrences of `gpt-5.3-codex-spark` with `gpt-5.3-codex` in `src/types/config.ts`
- Update the `CodexModelAlias` type: rename the `'spark'` alias or update its mapping to point to `gpt-5.3-codex`
- Update any model resolution/mapping code in `src/utils/config.ts` that references `gpt-5.3-codex-spark`
- Update README.md if it mentions the old model name

## Implementation Steps
1. In `src/types/config.ts`, change `DEFAULT_CONFIG.codexModels.nameGeneration` from `'gpt-5.3-codex-spark'` to `'gpt-5.3-codex'`
2. In `src/types/config.ts`, change `DEFAULT_CONFIG.codexModels.failureAnalysis` from `'gpt-5.3-codex-spark'` to `'gpt-5.3-codex'`
3. In `src/types/config.ts`, change `DEFAULT_CONFIG.codexEffortMapping.low` from `'gpt-5.3-codex-spark'` to `'gpt-5.3-codex'`
4. Search for any other references to `gpt-5.3-codex-spark` across the codebase and update them (e.g., in `src/utils/config.ts` model resolution maps, README.md)
5. Run `npm run build` to verify no type errors

## Acceptance Criteria
- [ ] No references to `gpt-5.3-codex-spark` remain in the codebase
- [ ] `gpt-5.3-codex` is used for nameGeneration, failureAnalysis, and effort: low
- [ ] Build passes with no errors
