---
effort: medium
---
# Task: Remove Context Config Surface

## Objective
Remove the public `context` config section while preserving backward-compatible loading of existing config files that still contain it.

## Requirements
- Delete `ContextConfig` and the `context` field from the typed RAF config surface in `src/types/config.ts`.
- Remove `context` from config key validation, deep-merge defaults, and resolved-config cloning paths in `src/utils/config.ts`.
- Keep `raf config set` and schema-aware config editing from creating new `context.*` keys after the removal.
- Existing `~/.raf/raf.config.json` files that still contain a top-level `context` object must continue to load successfully and behave as if that block was absent.
- Preserve strict validation for unrelated unknown keys; only the removed legacy `context` block gets grandfathered in.

## Key Decisions
- Treat `context` as removed legacy config, not as a hidden supported feature.
- Compatibility applies to reading old config files, not to writing new `context` settings through `raf config`.
- Legacy-key stripping should be centralized so `resolveConfig()`, config validation after `raf config wizard`, and preset load paths all behave the same way.

## Acceptance Criteria
- [ ] `RafConfig`, `DEFAULT_CONFIG`, and `CONFIG_SCHEMA` no longer expose a `context` section.
- [ ] A config file containing only a legacy `context` block resolves without throwing and produces the same runtime behavior as an empty config file.
- [ ] `raf config set context.maxCompletedTasks 10` fails because `context` is no longer a valid schema path.
- [ ] Unknown non-legacy keys still fail validation.

## Context
`src/core/project-context.ts` currently pulls rendering bounds from `getResolvedConfig().context`, so removing the config surface requires disentangling the public schema before the generator can be refactored cleanly.

## Implementation Steps
1. Remove `context` from the config types, defaults, and schema metadata in `src/types/config.ts`.
2. Add a normalization step in `src/utils/config.ts` that strips a top-level legacy `context` block before validation/merge logic runs.
3. Update config-command paths that validate persisted user config so they use the same normalization behavior.
4. Confirm the schema-aware `config set` flow now rejects `context.*` because the path no longer exists in `CONFIG_SCHEMA`.

## Files to Modify
- `src/types/config.ts`
- `src/utils/config.ts`
- `src/commands/config.ts`
- `src/commands/preset.ts`

## Risks & Mitigations
- Load-time compatibility and write-time schema enforcement can drift.
- Mitigation: route both file-validation and config-resolution through one shared legacy-sanitization helper instead of duplicating special cases.

