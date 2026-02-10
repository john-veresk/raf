# Outcome: Implement `raf config` Command

## Summary

Implemented the `raf config` CLI command that launches an interactive Claude Sonnet TTY session for viewing and editing RAF configuration, with `--reset` support and post-session validation.

## Key Changes

### `src/commands/config.ts` (new file)
- `createConfigCommand()` — Commander.js command definition with variadic `[prompt...]` argument and `--reset` flag
- `runConfigSession(initialPrompt?)` — Spawns interactive Claude TTY session with:
  - Config documentation from `src/prompts/config-docs.md` as system prompt
  - Current config file contents (or "no config file" message)
  - Model from `config.models.config` (default: sonnet)
  - Effort level from `config.effort.config` (default: medium) via `CLAUDE_CODE_EFFORT_LEVEL` env var
  - `--dangerously-skip-permissions` so Claude can write to `~/.raf/raf.config.json`
- `handleReset()` — Prompts for confirmation via readline, deletes config file on confirm
- `postSessionValidation()` — After Claude session ends, reads and validates config file, reports success/warnings
- `loadConfigDocs()` — Reads the .md file at runtime using `import.meta.url` path resolution
- `getCurrentConfigState()` — Returns config file contents or "no config file" message
- `buildConfigSystemPrompt()` — Combines config docs and current state into system prompt

### `src/index.ts`
- Registered `createConfigCommand()` so `raf config` appears in CLI help

### `tests/unit/config-command.test.ts` (new file)
- 20 tests covering:
  - Command setup (5): name, description, variadic argument, --reset option, parent registration
  - Post-session validation (7): valid configs, unknown keys, invalid models/efforts, non-object, empty config
  - Reset flow (2): file deletion, non-existent file handling
  - Config file round-trip (3): write/read valid, invalid JSON detection, validation error detection
  - System prompt construction (2): no-file state, existing config state

## Acceptance Criteria

- [x] `raf config` starts an interactive Claude Sonnet session with config knowledge
- [x] `raf config "use haiku for name generation"` starts session with that prompt
- [x] `raf config --reset` prompts for confirmation and deletes config file
- [x] Claude session has full config documentation as system prompt
- [x] Claude session shows current config state
- [x] Post-session validation checks the config file
- [x] `~/.raf/` directory is created if it doesn't exist (Claude instructed to create it)
- [x] Command is registered and appears in `raf --help`
- [x] Tests cover command setup and reset flow (20 tests)
- [x] All tests pass (1060/1061; 1 pre-existing failure in unrelated test)

<promise>COMPLETE</promise>
