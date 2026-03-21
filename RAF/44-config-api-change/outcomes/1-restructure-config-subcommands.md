Implemented the `raf config` CLI refactor from flag-based behavior to explicit subcommands.

Key changes:
- Refactored [src/commands/config.ts](/Users/eremeev/projects/RAF/src/commands/config.ts) so `raf config` is now a namespace/help entry point with `get`, `set`, `reset`, and `wizard` subcommands.
- Preserved existing config read/write/reset/session helper behavior, including resolved dot-path reads, JSON-aware value parsing, schema validation, default-pruning, reset confirmation, and broken-config recovery for the interactive editor.
- Updated config-related user-facing text in [README.md](/Users/eremeev/projects/RAF/README.md), [src/prompts/config-docs.md](/Users/eremeev/projects/RAF/src/prompts/config-docs.md), and [src/commands/preset.ts](/Users/eremeev/projects/RAF/src/commands/preset.ts) to point users at `raf config wizard` / `raf config reset` instead of the removed flag API.
- Reworked [tests/unit/config-command.test.ts](/Users/eremeev/projects/RAF/tests/unit/config-command.test.ts) to cover the real subcommand API, including bare-help behavior, `get`, `set`, `reset`, and wizard recovery.
- Updated a few stale tests outside the config command area so the suite matches current CLI behavior and config-driven defaults: [tests/unit/planning-prompt.test.ts](/Users/eremeev/projects/RAF/tests/unit/planning-prompt.test.ts), [tests/unit/amend-prompt.test.ts](/Users/eremeev/projects/RAF/tests/unit/amend-prompt.test.ts), [tests/unit/name-generator.test.ts](/Users/eremeev/projects/RAF/tests/unit/name-generator.test.ts), and [tests/unit/claude-runner-interactive.test.ts](/Users/eremeev/projects/RAF/tests/unit/claude-runner-interactive.test.ts).
- Added agent notes in [CLAUDE.md](/Users/eremeev/projects/RAF/CLAUDE.md) documenting the prompt-test drift and the need to avoid hardcoded default-provider assumptions in config-sensitive tests.

Verification:
- `npm run lint`
- `npm test -- --watchman=false --runInBand tests/unit/config-command.test.ts`
- `npm test -- --watchman=false --runInBand`

Notes:
- Jest needed `--watchman=false` in this environment because watchman socket access is blocked in the sandbox.

<promise>COMPLETE</promise>
