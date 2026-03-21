---
effort: medium
---
# Task: Remove --provider Flag

## Objective
Remove the `--provider` CLI flag from all commands, relying entirely on the ModelEntry object's `provider` field in config.

## Context
The `--provider` flag is redundant now that every ModelEntry includes a `provider` field. Since this is a greenfield project with no users, it can be removed immediately without deprecation.

## Dependencies
1

## Requirements
- Remove `--provider` / `-p` option from `raf plan` command
- Remove `--provider` / `-p` option from `raf do` command
- Remove the `providerOverride` parameter from `getModel()` in config utils
- Validate in config that every model entry has a `provider` field (should already be done after task 1)
- Remove HarnessProvider type if it's only used for the flag (check usage first)
- Clean up any code paths that handle provider override logic

## Implementation Steps
1. Read `src/commands/plan.ts` — remove `.option('-p, --provider ...')` and all references to `options.provider`
2. Read `src/commands/do.ts` — remove `.option('-p, --provider ...')` and all references to `options.provider`
3. Read `src/utils/config.ts` — simplify `getModel()` function to remove `providerOverride` parameter
4. Search for any other usages of `providerOverride` or the provider flag across the codebase
5. Check if `HarnessProvider` type is still needed elsewhere; if only used for the flag, consider keeping it for config validation only
6. Update README.md to remove --provider flag documentation
7. Update config-docs.md if it references --provider

## Acceptance Criteria
- [ ] `raf plan --provider` no longer accepted
- [ ] `raf do --provider` no longer accepted
- [ ] `getModel()` no longer accepts a provider override parameter
- [ ] All model resolution uses the provider from ModelEntry config
- [ ] Documentation updated
- [ ] No dead code related to provider override remains

## Notes
- `getModel()` is at `src/utils/config.ts` line ~409
- Provider override logic: `if (providerOverride) { return { ...entry, provider: providerOverride }; }`
- HarnessProvider type may still be needed for the ModelEntry interface itself
