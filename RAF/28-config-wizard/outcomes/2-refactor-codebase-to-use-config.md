# Outcome: Refactor Codebase to Use Config

## Summary

Replaced all hardcoded settings throughout the codebase with config lookups using the schema from task 01. Every model name, effort level, commit format, and worktree default now reads from the centralized config system. CLI flags still take precedence over config values.

## Key Changes

### `src/utils/config.ts`
- Added `renderCommitMessage(template, variables)` utility that replaces `{placeholder}` tokens in commit format templates

### `src/utils/name-generator.ts`
- Replaced hardcoded `SONNET_MODEL` constant with `getModel('nameGeneration')` from config
- Replaced hardcoded `'claude'` command with `getClaudeCommand()` from config
- Updated JSDoc comments to be model-agnostic

### `src/core/failure-analyzer.ts`
- Replaced hardcoded `'haiku'` model with `getModel('failureAnalysis')` from config
- Uses `getClaudeCommand()` for CLI path resolution

### `src/core/pull-request.ts`
- Replaced hardcoded `'sonnet'` model with `getModel('prGeneration')` from config
- Uses `getClaudeCommand()` for CLI path resolution

### `src/core/claude-runner.ts`
- Replaced hardcoded `'opus'` default with `getModel('execute')` from config
- Uses `getClaudeCommand()` for CLI path resolution

### `src/utils/validation.ts`
- `resolveModelOption()` now accepts a `scenario` parameter (defaults to `'execute'`)
- Default model comes from `getModel(scenario)` instead of hardcoded `'opus'`

### `src/commands/plan.ts`
- Passes `'plan'` scenario to `resolveModelOption()` for correct model default
- Worktree mode default reads from `getWorktreeDefault()` config

### `src/commands/do.ts`
- Passes `'execute'` scenario to `resolveModelOption()` for correct model default
- Replaced hardcoded `'medium'` effort with `getEffort('execute')` from config
- Worktree mode default reads from `getWorktreeDefault()` config

### `src/prompts/execution.ts`
- Commit format in execution prompt dynamically generated from `getCommitFormat('task')` + `getCommitPrefix()` + `renderCommitMessage()`

### `src/core/git.ts`
- Plan/amend commit messages use `getCommitFormat('plan')`/`getCommitFormat('amend')` + `getCommitPrefix()` + `renderCommitMessage()`

### `tests/unit/pull-request.test.ts`
- Added `homedir` to the `node:os` mock (needed because `config.ts` is now imported transitively)

### `tests/unit/config.test.ts`
- Added 20 new tests:
  - 7 tests for `renderCommitMessage()` (basic replacement, unknown placeholders, all format types, custom prefix)
  - 10 tests verifying defaults match previous hardcoded values (models, effort, timeout, maxRetries, autoCommit, worktree, claudeCommand, commit formats)
  - 3 tests verifying config overrides work (custom models, effort, commit format)

## Acceptance Criteria

- [x] No hardcoded model names remain in execution paths (only in DEFAULT_CONFIG)
- [x] No hardcoded effort levels remain in execution paths
- [x] Commit format uses templates from config
- [x] CLI flags override config values (resolveModelOption passes CLI value first, falls back to config)
- [x] Behavior is identical to before when no config file exists (defaults match current hardcoded values)
- [x] All existing tests still pass (1040/1041; 1 pre-existing failure in unrelated test)
- [x] New tests verify config integration (20 new tests)

<promise>COMPLETE</promise>
