Updated the remaining config command documentation and help text so active user-facing references align with the subcommand-based config API.

Key changes:
- Updated [src/commands/config.ts](/Users/eremeev/projects/RAF/src/commands/config.ts) command descriptions so generated help text clearly describes the `get`, `set`, `reset`, `wizard`, and nested `preset` hierarchy.
- Updated [src/commands/preset.ts](/Users/eremeev/projects/RAF/src/commands/preset.ts) help text to describe presets as `raf config preset` subcommands.
- Updated [src/prompts/config-docs.md](/Users/eremeev/projects/RAF/src/prompts/config-docs.md) so the reset instructions point users to `raf config reset` instead of manually deleting the config file.

Notes:
- `README.md` already matched the new config command surface from earlier dependency work, so no additional README edits were required in this task.
- Verification completed with `npm test -- --watchman=false --runInBand tests/unit/config-command.test.ts` and `npm run lint`.
<promise>COMPLETE</promise>
