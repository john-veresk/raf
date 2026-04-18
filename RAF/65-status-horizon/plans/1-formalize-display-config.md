---
effort: medium
---
# Task: Formalize Display Config

## Objective
Introduce a real `display` config group with a supported status-list limit and remove the stale `showCacheTokens` config surface.

## Requirements
- Add a `DisplayConfig` shape to the config model and wire it into `RafConfig`, `DEFAULT_CONFIG`, and `CONFIG_SCHEMA`.
- Define `display.statusProjectLimit` as the only supported display setting for this task, with default `10`.
- Treat `0` as the unlimited sentinel for `display.statusProjectLimit`.
- Reject invalid values for `display.statusProjectLimit`: negatives, fractional numbers, strings, and `null`.
- Extend config validation, deep-merge logic, resolved defaults, and accessor helpers so `raf config get/set` can read and write `display.statusProjectLimit`.
- Remove stale `display.showCacheTokens` references from config-facing code and tests instead of reintroducing that dead option.
- Keep the cleanup scoped to dead config/test surface; do not add new cache-token display behavior.

## Acceptance Criteria
- [x] `resolveConfig()` returns `display.statusProjectLimit: 10` when no user config file exists.
- [x] `raf config set display.statusProjectLimit 25` persists and resolves to `25`.
- [x] `raf config set display.statusProjectLimit 0` persists and resolves to unlimited semantics.
- [x] Validation rejects `display.statusProjectLimit` values such as `-1`, `1.5`, and `null`.
- [x] No config schema, default, or config test still refers to `display.showCacheTokens`.

## Context
Current code has no implemented `display` group, but the test suite already contains stale `display.showCacheTokens` expectations. The new status feature needs a real display config contract, and the dead setting should be removed rather than carried forward.

## Implementation Steps
1. Add `DisplayConfig` and `display.statusProjectLimit` to [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/types/config.ts), with default `10`.
2. Update [src/utils/config.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/utils/config.ts) so validation recognizes `display`, enforces non-negative-integer-or-zero semantics for `statusProjectLimit`, deep-merges the new group, and exposes a small accessor for the resolved limit.
3. Update config tests in [tests/unit/config.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/config.test.ts) and [tests/unit/config-command.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/config-command.test.ts) to cover the new key and remove `showCacheTokens` assumptions.
4. Remove dead `showCacheTokens` references from any remaining tests that still model it as config, especially [tests/unit/terminal-symbols.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/terminal-symbols.test.ts).

## Files to Modify
- [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/types/config.ts)
- [src/utils/config.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/utils/config.ts)
- [tests/unit/config.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/config.test.ts)
- [tests/unit/config-command.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/config-command.test.ts)
- [tests/unit/terminal-symbols.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/terminal-symbols.test.ts)

## Risks & Mitigations
- Stale tests currently imply a broader display subsystem than the runtime actually has.
Keep this task narrowly focused on the config contract and delete dead expectations instead of rebuilding abandoned behavior.
- Config helpers are cached across process lifetime and heavily exercised in tests.
Use the existing cache-reset patterns in tests so new `display` assertions do not leak state between cases.

## Notes
- Pick a precise key name and use it consistently in docs/tests; `display.statusProjectLimit` keeps the scope explicit to `raf status`.
