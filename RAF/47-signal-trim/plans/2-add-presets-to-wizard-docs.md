---
effort: low
---
# Task: Add Presets Documentation to Config Wizard

## Objective
Add a presets section to `config-docs.md` so the config wizard understands presets and can manage them (save/load/list/delete) during interactive sessions.

## Context
The config wizard (`raf config wizard`) uses `src/prompts/config-docs.md` as its knowledge base. Currently it has no information about presets, so it can't answer questions or help manage them. The preset system already exists (`src/commands/preset.ts`) with full save/load/list/delete functionality via `raf config preset <cmd>`.

## Dependencies
1

## Requirements
- Add a `### Presets` section to `config-docs.md` covering: storage path (`~/.raf/presets/`), CLI commands, name validation rules
- Add preset management instructions to the "Config Editing Session Instructions" section so the wizard can directly save/load/list/delete presets during sessions

## Implementation Steps
1. **Add presets reference section** to `config-docs.md` (after the `display` section removal from task 1, place it before "Valid Model Names"):
   - Storage path: `~/.raf/presets/<name>.json`
   - CLI commands: `raf config preset save <name>`, `load <name>`, `list`, `delete <name>`
   - Name rules: alphanumeric, hyphens, underscores only

2. **Add wizard instructions** in the "Config Editing Session Instructions" section:
   - Add a subsection explaining the wizard can manage presets
   - The wizard should read/write preset files directly at `~/.raf/presets/<name>.json`
   - For `save`: read current config file, validate, write to preset path
   - For `load`: read preset file, validate, write to config path (`~/.raf/raf.config.json`)
   - For `list`: read `~/.raf/presets/` directory, show `.json` files
   - For `delete`: remove the preset file after confirming with user
   - Validate preset names match `^[a-zA-Z0-9_-]+$`

3. **Add common user requests** for presets to the existing "Common User Requests" list:
   - "Save this as a preset" — save current config to a named preset
   - "Load preset X" — load a preset into active config
   - "Show my presets" — list all saved presets

## Acceptance Criteria
- [ ] `config-docs.md` has a presets section with storage path, CLI commands, and name rules
- [ ] Wizard instructions include guidance for managing presets during sessions
- [ ] Common user requests section includes preset-related entries
- [ ] Project builds cleanly (`npm run build`)

## Notes
- Preset files are full config JSON snapshots — the same format as `~/.raf/raf.config.json`. The wizard should validate them with the same rules as the main config.
- The wizard already has file read/write capabilities via Claude CLI tools, so it can directly manage preset files without needing new code.
