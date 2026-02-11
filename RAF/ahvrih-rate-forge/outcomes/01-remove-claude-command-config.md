# Outcome: Remove `claudeCommand` from Config

## Summary
Removed the `claudeCommand` configuration key entirely from the RAF config system. The Claude CLI binary name is now hardcoded as `"claude"` throughout the codebase. This simplifies the config schema and eliminates a failure path where a malformed config file could prevent `raf config` from launching as a repair tool.

## Key Changes

### Types (`src/types/config.ts`)
- Removed `claudeCommand: string` from `RafConfig` interface
- Removed `claudeCommand: 'claude'` from `DEFAULT_CONFIG`
- Removed `claudeCommand` from deprecated `DEFAULT_RAF_CONFIG` export

### Config Utilities (`src/utils/config.ts`)
- Removed `claudeCommand` from `VALID_TOP_LEVEL_KEYS` set
- Removed `claudeCommand` validation logic
- Removed `claudeCommand` handling from `deepMerge()` function
- Removed `getClaudeCommand()` accessor function
- Updated deprecated `loadConfig()` return type to exclude `claudeCommand`

### Claude Runner (`src/core/claude-runner.ts`)
- Updated `getClaudePath()` to use hardcoded `'which claude'` instead of calling `getClaudeCommand()`
- Removed `getClaudeCommand` import

### Failure Analyzer (`src/core/failure-analyzer.ts`)
- Updated `getClaudePath()` to use hardcoded `'which claude'`
- Removed `getClaudeCommand` import

### Pull Request (`src/core/pull-request.ts`)
- Updated `callClaudeForPrBody()` to use hardcoded `'which claude'`
- Removed `getClaudeCommand` import

### Name Generator (`src/utils/name-generator.ts`)
- Updated `runClaudePrint()` to spawn `'claude'` directly instead of using `getClaudeCommand()`
- Removed `getClaudeCommand` import

### Documentation
- Updated `src/prompts/config-docs.md` to remove `claudeCommand` section and references
- Updated `CLAUDE.md` to remove `claudeCommand` from config schema and helper accessor list

### Tests (`tests/unit/config.test.ts`)
- Removed `getClaudeCommand` import
- Removed `claudeCommand` from full valid config test
- Removed tests for invalid `claudeCommand` values (empty, whitespace-only, non-string)
- Removed `claudeCommand` default value test
- Added test to verify that `claudeCommand` is now rejected as an unknown key

## Acceptance Criteria Verification
- [x] `claudeCommand` key no longer exists in types, defaults, validation, or documentation
- [x] `getClaudePath()` works without reading any config
- [x] `raf config` can launch successfully even with a malformed config file (config is no longer needed for CLI path resolution)
- [x] All config tests pass (92 passed)
- [x] Config files containing `claudeCommand` are handled gracefully (rejected as unknown key with clear error message)

## Notes
- The pre-existing test failures in `claude-runner-interactive.test.ts` and `validation.test.ts` are unrelated to this change - they concern model resolution expecting short aliases but receiving full model IDs
- This change addresses PR #4 review comment about `raf config` being unusable as a repair path when config is malformed

<promise>COMPLETE</promise>
