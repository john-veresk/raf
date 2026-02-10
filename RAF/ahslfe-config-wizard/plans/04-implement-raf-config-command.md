# Task: Implement `raf config` Command

## Objective
Create the `raf config [prompt]` CLI command that launches an interactive Claude Sonnet TTY session for editing RAF configuration.

## Context
Users need a natural-language way to modify their config. This command spawns Claude Sonnet with the config documentation as a system prompt, giving it full knowledge of the schema. It also supports `--reset` to restore defaults.

## Dependencies
01, 02, 03

## Requirements

### `raf config` (no arguments)
- Spawn an interactive Claude Sonnet TTY session (same node-pty approach used in `raf plan`)
- Claude receives the config docs from `src/prompts/config-docs.md` as an appended system prompt
- Claude also receives the current config file contents (or "no config file exists, using defaults")
- User has a back-and-forth conversation with Claude to modify settings
- Claude reads, modifies, and writes `~/.raf/raf.config.json`
- After Claude writes, RAF validates the result and reports errors if invalid

### `raf config <prompt>`
- Same as above but with an initial prompt pre-filled
- Still interactive TTY — user can continue the conversation after the initial prompt is handled

### `raf config --reset`
- Prompt user for confirmation ("This will delete ~/.raf/raf.config.json and restore all defaults. Continue? [y/N]")
- On confirm: delete the config file, print success message
- On deny: abort, print "Cancelled"

### Validation after session:
- When the Claude session ends, read the config file and validate it
- If invalid: print warnings showing what's wrong, but don't delete the file (user can fix it)
- If valid: print "Config updated successfully" with a summary of changes

### Model and effort:
- Use `config.models.config` for the model (default: `'sonnet'`)
- Use `config.effort.config` for reasoning effort (default: `'medium'`)

## Implementation Steps
1. Create `src/commands/config.ts` with the Commander.js command definition
2. Register the command in `src/index.ts` CLI setup
3. Implement `--reset` flag: confirmation prompt, file deletion, feedback
4. Build the system prompt: load `src/prompts/config-docs.md` content, append current config state
5. Spawn interactive Claude session using the existing `ClaudeRunner` TTY infrastructure (same pattern as planning mode)
6. Pass the model from `config.models.config` and effort from `config.effort.config`
7. After session ends: validate the config file, report results
8. Handle edge cases: `~/.raf/` directory doesn't exist (create it), config file doesn't exist yet (that's fine, Claude will create it)
9. Write tests for the command setup, reset flow, and post-session validation

## Acceptance Criteria
- [ ] `raf config` starts an interactive Claude Sonnet session with config knowledge
- [ ] `raf config "use haiku for name generation"` starts session with that prompt
- [ ] `raf config --reset` prompts for confirmation and deletes config file
- [ ] Claude session has full config documentation as system prompt
- [ ] Claude session shows current config state
- [ ] Post-session validation checks the config file
- [ ] `~/.raf/` directory is created if it doesn't exist
- [ ] Command is registered and appears in `raf --help`
- [ ] Tests cover command setup and reset flow

## Notes
- Reuse the existing TTY session infrastructure from `src/core/claude-runner.ts` — don't reinvent it
- The planning command in `src/commands/plan.ts` is the best reference for how to spawn interactive Claude sessions
- Claude needs `--dangerously-skip-permissions` so it can write to `~/.raf/raf.config.json` without asking
- The config docs file needs to be readable at runtime — consider how the built JS accesses the .md file (may need to copy it to dist or embed it as a string)
