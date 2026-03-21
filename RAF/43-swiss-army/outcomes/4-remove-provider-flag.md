# Outcome: Remove --provider Flag

## Summary

Removed the `--provider` / `-p` CLI flag from both `raf plan` and `raf do` commands. Provider is now exclusively determined by the `provider` field in each ModelEntry in the config file.

## Changes Made

- **`src/commands/plan.ts`**: Removed `-p, --provider` option, removed `provider` from `PlanCommandOptions` interface, removed provider override from `getModel()` calls
- **`src/commands/do.ts`**: Removed `-p, --provider` option, removed `providerOverride` from `SingleProjectOptions`, `resolveTaskModel()`, and all `getModel()`/`resolveEffortToModel()` calls
- **`src/utils/config.ts`**: Simplified `getModel()`, `getEffortMapping()`, and `resolveEffortToModel()` — removed `providerOverride` parameter from all three
- **`src/types/config.ts`**: Removed `provider` field from `PlanCommandOptions` and `DoCommandOptions` interfaces
- **`src/core/codex-runner.ts`**: Updated `getModel('execute')` call (was passing `'codex'` as provider override)
- **`README.md`**: Removed `--provider` from command reference tables and feature descriptions
- **`src/prompts/config-docs.md`**: Removed CLI precedence section about `--provider` override
- **`tests/unit/plan-command-auto-flag.test.ts`**: Updated test to verify `--provider` is no longer present

## Acceptance Criteria Status

- [x] `raf plan --provider` no longer accepted — option removed
- [x] `raf do --provider` no longer accepted — option removed
- [x] `getModel()` no longer accepts a provider override parameter — simplified to single `scenario` arg
- [x] All model resolution uses the provider from ModelEntry config — no override paths remain
- [x] Documentation updated — README and config-docs cleaned up
- [x] No dead code related to provider override remains — `providerOverride` grep returns zero results

<promise>COMPLETE</promise>
