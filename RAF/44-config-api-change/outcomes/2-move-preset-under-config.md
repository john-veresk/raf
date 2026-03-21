Implemented the preset command move from top-level `raf preset` to nested `raf config preset ...` while keeping preset storage and behavior unchanged.

Key changes:
- Updated `src/commands/config.ts` to register the existing preset command as a nested `config` subcommand.
- Updated `src/commands/preset.ts` help and runtime guidance so user-facing messages point to `raf config preset ...`.
- Removed the top-level preset command registration from `src/index.ts`.
- Updated `README.md` examples and command reference to document presets under `raf config`.
- Extended `tests/unit/config-command.test.ts` to cover nested preset registration, removal of the top-level command, nested preset save/load/list/delete behavior, and updated guidance strings.

Verification:
- `npm test -- --watchman=false --runInBand tests/unit/config-command.test.ts`
- `npm run lint`
- `npm test -- --watchman=false --runInBand`

Notes:
- Preset files remain stored at `~/.raf/presets/*.json`; only CLI topology and messaging changed.
<promise>COMPLETE</promise>
