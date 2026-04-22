Removed the public `context` config surface from RAF while preserving backward-compatible loading of existing config files and presets that still contain a top-level legacy `context` block.

## Key Changes
- Updated `src/types/config.ts` so `RafConfig`, `DEFAULT_CONFIG`, and `CONFIG_SCHEMA` no longer expose `context`.
- Added centralized legacy-config sanitization in `src/utils/config.ts` and routed validation, config resolution, and persisted config writes through it.
- Updated `src/commands/config.ts` and `src/commands/preset.ts` so wizard validation, `config set`, and preset save/load flows ignore legacy top-level `context` blocks but reject new `context.*` schema writes.
- Replaced the temporary runtime dependency on `getResolvedConfig().context` in `src/core/project-context.ts` with internal constants so the removed config field no longer breaks compilation.
- Added focused regression coverage in `tests/unit/config.test.ts` and `tests/unit/config-command.test.ts` for legacy compatibility, schema rejection of `context.*`, and preset sanitization.

## Decision Updates
None.

## Notes
- Documentation cleanup remains deferred to the planned docs task.
- Verification completed with `npm run lint` and `npm test -- --runInBand tests/unit/config.test.ts tests/unit/config-command.test.ts tests/unit/project-context.test.ts`.
<promise>COMPLETE</promise>
