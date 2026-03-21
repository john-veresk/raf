---
effort: high
---
# Task: Support Config Presets

## Objective
Add a preset system that lets users save, load, list, and delete named configuration profiles, enabling easy switching between Claude and Codex setups.

## Context
Users may want different configurations for different workflows (e.g., a Claude-focused setup vs a Codex-focused setup). Presets store complete config snapshots as named JSON files that can be switched with a single command.

## Dependencies
1

## Requirements
- Store presets as JSON files in `~/.raf/presets/<name>.json`
- Create `~/.raf/presets/` directory if it doesn't exist
- Implement `raf preset save <name>` — copy current config to a preset file
- Implement `raf preset load <name>` — copy preset file to active config (overwrite current config)
- Implement `raf preset list` — show all saved presets with brief info
- Implement `raf preset delete <name>` — remove a preset file
- Preset files are complete copies of raf.config.json (not diffs/patches)
- Show confirmation messages for destructive operations (load overwrites current config)
- Handle edge cases: preset not found, preset already exists (overwrite with confirmation)

## Implementation Steps
1. Create a new command file `src/commands/preset.ts`
2. Add the `preset` command to the CLI with subcommands: save, load, list, delete
3. Implement `save`: read current `~/.raf/raf.config.json`, write to `~/.raf/presets/<name>.json`
4. Implement `load`: read `~/.raf/presets/<name>.json`, write to `~/.raf/raf.config.json`, validate the loaded config
5. Implement `list`: read `~/.raf/presets/` directory, for each file show name and brief summary (e.g., provider info from models)
6. Implement `delete`: remove `~/.raf/presets/<name>.json` with confirmation
7. Register the preset command in the main CLI entry point (likely `src/index.ts` or `src/cli.ts`)
8. Add error handling for missing presets directory, invalid JSON, etc.
9. Update README.md with preset command documentation

## Acceptance Criteria
- [ ] `raf preset save claude-setup` saves current config as a named preset
- [ ] `raf preset load claude-setup` restores the saved config
- [ ] `raf preset list` shows all available presets
- [ ] `raf preset delete claude-setup` removes a preset
- [ ] Preset files stored in `~/.raf/presets/`
- [ ] Error messages for missing presets, invalid names
- [ ] Loaded config is validated before applying
- [ ] README.md updated with preset commands

## Notes
- Look at how `src/utils/config.ts` reads/writes config files to follow existing patterns
- The config path is likely defined as a constant — reuse it
- For `list`, showing the provider from each model entry would help users identify presets at a glance
- Consider showing a diff or summary when loading a preset so users know what changed
