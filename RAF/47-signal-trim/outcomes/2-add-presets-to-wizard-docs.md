# Outcome: Add Presets Documentation to Config Wizard

## Summary
Added presets documentation to `config-docs.md` so the config wizard can understand and manage presets during interactive sessions.

## Changes Made

### `src/prompts/config-docs.md`
- Added `### presets — Named Config Snapshots` section before "Valid Model Names", covering storage path (`~/.raf/presets/<name>.json`), all four CLI commands, and name validation rules
- Added `### Managing Presets` subsection in "Config Editing Session Instructions" with direct file operation instructions for save/load/list/delete
- Added three preset-related entries to "Common User Requests": save preset, load preset, show presets

## Verification
- Build passes cleanly (`npm run build`)

<promise>COMPLETE</promise>
