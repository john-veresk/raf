## Summary

Removed the public `context` config surface while keeping backward-compatible loading for existing config files and presets that still contain a legacy top-level `context` block.

## Key Changes

- Confirmed `src/types/config.ts` no longer exposes `context` through `RafConfig`, `DEFAULT_CONFIG`, or `CONFIG_SCHEMA`.
- Centralized legacy `context` stripping in `src/utils/config.ts` so validation, resolution, and persisted config writes all treat the removed block as absent.
- Kept `raf config set` schema-aware by rejecting new `context.*` paths through the current schema in `src/commands/config.ts`.
- Preserved preset compatibility in `src/commands/preset.ts` by validating legacy preset files after the same normalization step used elsewhere.
- Added regression coverage in `tests/unit/config-command.test.ts` for loading a legacy preset that still contains a top-level `context` block.
- Marked the acceptance criteria complete in `plans/1-remove-context-config-surface.md`.

## Decision Updates

None.

## Notes

- Verification passed with `npm run lint`.
- Verification passed with `npm test -- --runInBand tests/unit/config.test.ts tests/unit/config-command.test.ts tests/unit/project-context.test.ts`.
- I left the pre-existing worktree change in `RAF/75-limitless-horizon/context.md` untouched.

<promise>COMPLETE</promise>
