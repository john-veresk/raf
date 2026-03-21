# Outcome: Unify Model Config Schema

## Summary

Replaced the provider-split model configuration with a unified `ModelEntry` schema where every model entry is `{ model, provider, reasoningEffort? }`. Removed `--model` and `--sonnet` CLI flags. Removed legacy `provider`, `codexModels`, and `codexEffortMapping` config keys.

## Changes Made

### `src/types/config.ts`
- Added `ModelEntry` interface: `{ model: string, provider: HarnessProvider, reasoningEffort?: TaskEffortLevel }`
- Changed `ModelsConfig` and `EffortMappingConfig` to use `ModelEntry` instead of string values
- Removed `provider`, `codexModels`, `codexEffortMapping` from `RafConfig`
- Updated `DEFAULT_CONFIG` with `ModelEntry` objects for all model/effort entries
- Removed `model` and `sonnet` from `PlanCommandOptions` and `DoCommandOptions`

### `src/utils/config.ts`
- Added `REMOVED_KEYS` map rejecting legacy keys with helpful migration messages
- Added `validateModelEntry()` for validating `ModelEntry` objects
- `validateConfig()` validates model entries as objects, not strings
- `deepMerge()` uses `mergeModelEntry()` for per-entry model merging
- `getModel()` returns `ModelEntry` with optional `providerOverride` parameter
- `resolveEffortToModel()` returns `ModelEntry`
- `applyModelCeiling()` works with `ModelEntry` objects
- Added `parseModelSpec()` for parsing frontmatter model strings to derive provider

### `src/utils/validation.ts`
- Removed `resolveModelOption()` function entirely

### `src/commands/plan.ts`
- Removed `--model` and `--sonnet` Commander options
- Updated to use `ModelEntry` for runner creation and logging

### `src/commands/do.ts`
- Removed `--model` and `--sonnet` Commander options
- `resolveTaskModel` returns `ModelEntry` instead of string
- Uses `parseModelSpec()` for frontmatter model parsing

### `src/commands/config.ts`
- Updated to use `ModelEntry` for runner creation

### `src/utils/name-generator.ts`
- Removed `provider` parameter from all functions (now config-driven)
- Uses `getModel('nameGeneration')` to get both model and provider

### `src/core/failure-analyzer.ts`
- Updated `getModel('failureAnalysis')` usage for `ModelEntry`

### `src/core/pull-request.ts`
- Updated `getModel('prGeneration')` usage for `ModelEntry`

### `tests/unit/config.test.ts`
- Complete rewrite for new `ModelEntry` schema
- Tests for rejected legacy keys, invalid entries, mixed-provider configs

### `tests/unit/config-command.test.ts`
- Updated all model config examples to use `ModelEntry` objects

### `tests/unit/validation.test.ts`
- Removed `resolveModelOption` tests, added verification it's not exported

### `tests/unit/name-generator.test.ts`
- Updated for config-driven behavior (no provider parameter)

### `tests/unit/plan-command-auto-flag.test.ts`
- Updated to verify `--model`/`--sonnet` flags are absent

### `README.md`
- Updated config examples to use `ModelEntry` objects
- Rewrote provider configuration section
- Removed `--model` and `--sonnet` from command reference tables

### `src/prompts/config-docs.md`
- Complete rewrite for `ModelEntry` schema
- Updated all examples, validation rules, and config editor instructions

## Acceptance Criteria

- [x] `ModelEntry` interface with `{ model, provider, reasoningEffort? }` replaces string model values
- [x] `DEFAULT_CONFIG` uses `ModelEntry` objects for all `models` and `effortMapping` entries
- [x] Legacy `provider`, `codexModels`, `codexEffortMapping` keys are rejected with migration messages
- [x] `--model` and `--sonnet` CLI flags removed from `raf plan` and `raf do`
- [x] `--provider` CLI flag kept as override mechanism
- [x] `getModel()` returns `ModelEntry` (not string)
- [x] `resolveModelOption` removed from validation.ts
- [x] All consumers updated: plan, do, config, name-generator, failure-analyzer, pull-request
- [x] README.md and config-docs.md updated for new schema
- [x] All tests pass (4 pre-existing failures unrelated to this change)

<promise>COMPLETE</promise>
