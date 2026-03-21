# Task 1: Config Schema & Provider Types

## Summary
Extended the config system to support multiple CLI providers (claude, codex) with harness-prefixed model names and provider-specific model mappings.

## Changes Made

### `src/types/config.ts`
- Added `HarnessProvider` type (`'claude' | 'codex'`)
- Added `CodexModelAlias` type (`'spark' | 'codex' | 'gpt54'`)
- Added `ModelAlias` and `ModelName` types (provider-agnostic unions)
- Added `provider: HarnessProvider` to `RafConfig` with default `'claude'`
- Added `codexModels` and `codexEffortMapping` config sections parallel to Claude ones
- Added `VALID_CODEX_MODEL_ALIASES` and `VALID_HARNESS_PROVIDERS` constants
- Added `provider?: HarnessProvider` to `PlanCommandOptions` and `DoCommandOptions`
- Kept backward-compatible `ClaudeModelAlias` and `ClaudeModelName` types

### `src/utils/config.ts`
- Added `CODEX_MODEL_ID_PATTERN` for Codex model validation
- Updated `isValidModelName()` to accept Claude aliases, Codex aliases, raw Codex IDs, and harness-prefixed format (`claude/opus`, `codex/gpt-5.4`)
- Added `parseModelSpec()` function to parse harness-prefixed model specs
- Updated `getModel()` and `resolveEffortToModel()` to accept optional provider parameter
- Added Codex model tier ordering (`CODEX_MODEL_TIER_ORDER`)
- Updated `getModelTier()`, `getModelShortName()`, `resolveFullModelId()` for Codex models
- Updated `MODEL_ALIAS_TO_FULL_ID` with Codex alias mappings
- Updated `VALID_TOP_LEVEL_KEYS`, `validateConfig()`, `deepMerge()`, `resolveConfig()` for new fields

### `src/utils/validation.ts`
- Updated `validateModelName()` to delegate to `isValidModelName()` (DRY)
- Updated error message in `resolveModelOption()` to mention harness-prefixed format

### `src/commands/plan.ts` and `src/commands/do.ts`
- Added `--provider` / `-p` CLI flag to both commands

## Acceptance Criteria
- [x] `provider` field exists in config with `'claude'` default
- [x] Harness-prefixed model names parse correctly (e.g., `codex/gpt-5.4`)
- [x] Unprefixed aliases still work and default to claude
- [x] Codex model defaults are defined
- [x] Config validation accepts new fields and rejects invalid ones
- [x] `--provider` flag available on `raf plan` and `raf do`
- [x] TypeScript compiles without errors

## Notes
- One pre-existing test failure in `name-generator.test.ts` (hardcoded `haiku` expectation vs config default `sonnet` for `nameGeneration`) — not related to this task.

<promise>COMPLETE</promise>
