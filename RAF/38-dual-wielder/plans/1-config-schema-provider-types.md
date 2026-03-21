---
effort: high
---
# Task: Config Schema & Provider Types

## Objective
Extend the config system to support multiple CLI providers (claude, codex) with harness-prefixed model names and provider-specific model mappings.

## Context
RAF currently hardcodes Claude as the only CLI provider. To support Codex CLI alongside Claude, we need to introduce a provider abstraction at the config/type level first. This is the foundation task — all other tasks depend on it.

## Requirements
- Add a `provider` field to `RafConfig` (default: `'claude'`)
- Support harness-prefixed model format: `claude/opus`, `codex/gpt-5.4`, etc.
- Unprefixed aliases (`opus`, `sonnet`, `haiku`) default to `claude/` prefix — existing configs keep working
- Add Codex-specific model mappings and effort mappings
- Add provider to CLI command options (`--provider` flag)
- Config validation must accept both old (unprefixed) and new (prefixed) model formats

## Implementation Steps

1. **Update `src/types/config.ts`**:
   - Add `HarnessProvider` type: `'claude' | 'codex'`
   - Add `provider: HarnessProvider` to `RafConfig` with default `'claude'`
   - Add `provider` to `DEFAULT_CONFIG`
   - Rename `ClaudeModelAlias` to `ModelAlias` (keep backward-compat re-export)
   - Rename `ClaudeModelName` to `ModelName` (keep backward-compat re-export)
   - Add `CodexModelAlias` type for codex shorthand names (e.g., `'spark'`, `'codex'`, `'gpt54'`)
   - Update `PlanCommandOptions` and `DoCommandOptions` to include `provider?: HarnessProvider`
   - Add a `codexModels` config section parallel to `models`, with same scenario keys but codex model defaults
   - Add a `codexEffortMapping` config section parallel to `effortMapping`

2. **Add Codex model constants and defaults**:
   - Default codex models config:
     ```
     codexModels: {
       plan: 'gpt-5.3-codex',
       execute: 'gpt-5.4',
       nameGeneration: 'gpt-5.3-codex-spark',
       failureAnalysis: 'gpt-5.3-codex-spark',
       prGeneration: 'gpt-5.3-codex',
       config: 'gpt-5.3-codex',
     }
     ```
   - Default codex effort mapping:
     ```
     codexEffortMapping: {
       low: 'gpt-5.3-codex-spark',
       medium: 'gpt-5.3-codex',
       high: 'gpt-5.4',
     }
     ```

3. **Update `src/utils/config.ts`**:
   - Update `isValidModelName()` to accept:
     - Existing Claude aliases and full IDs (backward compat)
     - Harness-prefixed format: `claude/<alias-or-full-id>` or `codex/<model-id>`
     - Raw Codex model IDs (e.g., `gpt-5.4`, `gpt-5.3-codex-spark`)
   - Update `resolveFullModelId()` to handle prefixed format — strip prefix and resolve
   - Add `parseModelSpec(modelSpec: string): { provider: HarnessProvider; model: string }` that parses `codex/gpt-5.4` into parts
   - Update `getModel()` to accept optional provider parameter and return from the right config section
   - Update `resolveEffortToModel()` similarly
   - Add Codex model tier ordering for ceiling comparison
   - Update `getModelShortName()` to handle Codex models
   - Update `MODEL_ALIAS_TO_FULL_ID` to include codex aliases if any
   - Update `VALID_TOP_LEVEL_KEYS` set to include `'provider'`, `'codexModels'`, `'codexEffortMapping'`
   - Update `validateConfig()` to validate the new fields
   - Update `deepMerge()` to merge the new config sections

4. **Update `src/index.ts`**:
   - Add `--provider <provider>` option to `plan` and `do` commands
   - Pass provider through to command handlers

5. **Update `src/commands/do.ts`** and `src/commands/plan.ts`** (only the option plumbing):
   - Accept `provider` from CLI options
   - Thread it through to where model resolution happens

## Acceptance Criteria
- [ ] `provider` field exists in config with `'claude'` default
- [ ] Harness-prefixed model names parse correctly (e.g., `codex/gpt-5.4`)
- [ ] Unprefixed aliases still work and default to claude
- [ ] Codex model defaults are defined
- [ ] Config validation accepts new fields and rejects invalid ones
- [ ] `--provider` flag available on `raf plan` and `raf do`
- [ ] TypeScript compiles without errors

## Notes
- This task focuses on types, config, and validation only. The actual CLI runner abstraction is in the next task.
- Keep backward-compat re-exports for renamed types so other modules don't need immediate changes.
- The `codexModels` and `codexEffortMapping` config sections mirror the claude ones structurally, making the config symmetric.
