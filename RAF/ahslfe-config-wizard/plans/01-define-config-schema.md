# Task: Define Config Schema & Defaults

## Objective
Define the comprehensive JSON config schema with all user-facing configurable values and their defaults.

## Context
RAF currently has a minimal config in `src/types/config.ts` with only `defaultTimeout`, `defaultMaxRetries`, `autoCommit`, and `claudeCommand`. Many values are hardcoded across the codebase. This task creates the complete schema that all subsequent tasks will use.

## Requirements
- Config file: `~/.raf/raf.config.json`
- Built-in defaults embedded in code, global config in `~/.raf/` overrides them
- Strict validation: reject unknown keys and invalid values
- All values are optional in the file (defaults used for anything not specified)

### Config structure (user-facing settings only):

**Models** (per-scenario):
- `models.plan` — model for planning sessions (default: `'opus'`)
- `models.execute` — model for task execution (default: `'opus'`)
- `models.nameGeneration` — model for project name generation (default: `'sonnet'`)
- `models.failureAnalysis` — model for analyzing failures (default: `'haiku'`)
- `models.prGeneration` — model for PR body generation (default: `'sonnet'`)
- `models.config` — model for config editing sessions (default: `'sonnet'`)
- Valid values: `'sonnet'`, `'haiku'`, `'opus'`

**Reasoning effort** (per-scenario):
- `effort.plan` — effort for planning (default: `'high'`)
- `effort.execute` — effort for task execution (default: `'medium'`)
- `effort.nameGeneration` — effort for name gen (default: `'low'`)
- `effort.failureAnalysis` — effort for failure analysis (default: `'low'`)
- `effort.prGeneration` — effort for PR gen (default: `'medium'`)
- `effort.config` — effort for config sessions (default: `'medium'`)
- Valid values: `'low'`, `'medium'`, `'high'`

**Execution**:
- `timeout` — default task timeout in minutes (default: `60`)
- `maxRetries` — max retry attempts per task (default: `3`)
- `autoCommit` — auto-commit on task success (default: `true`)

**Worktree**:
- `worktree` — use worktree by default for plan/do (default: `false`)

**Commit format**:
- `commitFormat.task` — template for task commits (default: `'{prefix}[{projectId}:{taskId}] {description}'`)
- `commitFormat.plan` — template for plan commits (default: `'{prefix}[{projectId}] Plan: {projectName}'`)
- `commitFormat.amend` — template for amend commits (default: `'{prefix}[{projectId}] Amend: {projectName}'`)
- `commitFormat.prefix` — the prefix used in templates (default: `'RAF'`)

**CLI**:
- `claudeCommand` — path/name of claude CLI binary (default: `'claude'`)

## Implementation Steps
1. Replace the existing `RafConfig` type in `src/types/config.ts` with the new comprehensive schema (nested objects for `models`, `effort`, `commitFormat`)
2. Define a `DEFAULT_CONFIG` constant with all default values
3. Create a validation function that checks every key against the schema: valid model names, valid effort levels, number ranges, string formats, no unknown keys
4. Create a `resolveConfig()` function that deep-merges the default config with the user's partial config from `~/.raf/raf.config.json` — user values override defaults at the leaf level
5. Update `src/utils/config.ts` to use the new schema — `loadConfig()` should read from `~/.raf/raf.config.json` (not project-local), validate, and merge with defaults
6. Export helpers: `getModel(scenario)`, `getEffort(scenario)`, `getCommitFormat(type)`, `getTimeout()`, etc. for easy consumption
7. Write tests for validation (unknown keys rejected, invalid values rejected, partial configs merged correctly, defaults returned when no config file exists)

## Acceptance Criteria
- [ ] Comprehensive TypeScript types defined for the full config schema
- [ ] DEFAULT_CONFIG constant covers all settings with sensible defaults
- [ ] Validation rejects unknown keys, invalid model names, invalid effort levels, wrong types
- [ ] Deep-merge works correctly (partial overrides, nested objects)
- [ ] Config loads from `~/.raf/raf.config.json`
- [ ] Helper functions provide typed access to config values
- [ ] All tests pass

## Notes
- The existing `RafConfig` type and `loadConfig`/`saveConfig` in `src/utils/config.ts` need to be replaced, not extended — they currently load from project-local dirs
- The commit format template uses `{placeholder}` syntax — the rendering will happen in task 02 when code is refactored
- Keep `src/types/config.ts` as the single source of truth for config types
