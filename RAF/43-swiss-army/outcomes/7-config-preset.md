# Outcome: Support Config Presets

## Summary

Added a `raf preset` command with save, load, list, and delete subcommands for managing named configuration profiles stored as JSON files in `~/.raf/presets/`.

## Changes Made

- **`src/commands/preset.ts`** (new): Implements the four subcommands:
  - `save <name>`: Copies current `~/.raf/raf.config.json` to `~/.raf/presets/<name>.json` after validation
  - `load <name>`: Validates the preset, copies it to active config, and shows a brief summary
  - `list`: Shows all presets with provider and execute model info
  - `delete <name>`: Removes a preset file
  - Validates preset names (alphanumeric, hyphens, underscores only)
  - Creates `~/.raf/presets/` directory automatically
  - Validates config on both save and load
- **`src/index.ts`**: Registered the `preset` command
- **`README.md`**: Added preset command documentation in both the Commands section and the Command Reference table

## Acceptance Criteria Status

- [x] `raf preset save claude-setup` saves current config as a named preset
- [x] `raf preset load claude-setup` restores the saved config
- [x] `raf preset list` shows all available presets
- [x] `raf preset delete claude-setup` removes a preset
- [x] Preset files stored in `~/.raf/presets/`
- [x] Error messages for missing presets, invalid names
- [x] Loaded config is validated before applying
- [x] README.md updated with preset commands

<promise>COMPLETE</promise>
