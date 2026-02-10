# Outcome: Define Config Schema & Defaults

## Summary

Defined the comprehensive JSON config schema with all user-facing configurable values, validation, deep-merge, and typed helper accessors.

## Key Changes

### `src/types/config.ts`
- Replaced the old flat `RafConfig` interface with a comprehensive nested schema: `models`, `effort`, `commitFormat` sub-objects plus scalar fields (`timeout`, `maxRetries`, `autoCommit`, `worktree`, `claudeCommand`)
- Added `DEFAULT_CONFIG` constant with all defaults per the plan
- Added utility types: `ClaudeModelName`, `EffortLevel`, `ModelScenario`, `EffortScenario`, `CommitFormatType`, `DeepPartial<T>`, `UserConfig`
- Exported `VALID_MODELS` and `VALID_EFFORTS` arrays for validation
- Kept backward-compat `DEFAULT_RAF_CONFIG` export (deprecated) so existing consumers don't break

### `src/utils/config.ts`
- Added `validateConfig()` — strict validation that rejects unknown keys at every nesting level, validates model names, effort levels, number ranges, and types
- Added `ConfigValidationError` class for typed error handling
- Added `resolveConfig(configPath?)` — loads from `~/.raf/raf.config.json`, validates, and deep-merges with defaults
- Added `saveConfig(configPath, userConfig)` — writes partial user config with directory creation
- Added helper accessors: `getModel()`, `getEffort()`, `getCommitFormat()`, `getCommitPrefix()`, `getTimeout()`, `getMaxRetries()`, `getAutoCommit()`, `getWorktreeDefault()`, `getClaudeCommand()`
- Added `getResolvedConfig()` with caching and `resetConfigCache()` for tests
- Kept backward-compat `loadConfig()`, `getConfig()`, `getEditor()`, `getClaudeModel()` functions

### `tests/unit/config.test.ts`
- 50 tests covering: validation (unknown keys, invalid values, edge cases), deep-merge (partial nested overrides), resolveConfig (file loading, defaults, immutability), saveConfig, helper accessors, DEFAULT_CONFIG completeness

## Acceptance Criteria

- [x] Comprehensive TypeScript types defined for the full config schema
- [x] DEFAULT_CONFIG constant covers all settings with sensible defaults
- [x] Validation rejects unknown keys, invalid model names, invalid effort levels, wrong types
- [x] Deep-merge works correctly (partial overrides, nested objects)
- [x] Config loads from `~/.raf/raf.config.json`
- [x] Helper functions provide typed access to config values
- [x] All tests pass (50/50; 1 pre-existing failure in unrelated test)

<promise>COMPLETE</promise>
