# Outcome: Symlink-Based Preset Linking

## Summary
Changed `raf config preset save` and `raf config preset load` to use symlinks instead of file copies. Editing the active config now writes through to the linked preset automatically.

## Key Changes

### `src/commands/preset.ts`
- Added exported `getLinkedPresetName()` helper — detects if config is a symlink and extracts the preset name
- Added `removeConfigIfExists()` helper — safely removes config (regular file or symlink, including broken)
- `savePreset()`: moves config to preset file and creates symlink (handles regular file, re-linking, and same-preset no-op cases)
- `loadPreset()`: creates symlink instead of copying file content
- `listPresets()`: shows `(linked)` marker next to the active preset
- `deletePreset()`: unlinks config first if deleting the currently-linked preset

### `src/commands/config.ts`
- `handleGet()`: prints `(linked: <name>)` when config is symlinked and no key argument given
- `handleReset()`: uses `lstatSync` to detect symlinks (including broken), shows preset-aware confirmation message, removes symlink without deleting preset file

## Notes
- `fs.writeFileSync` follows symlinks, so `raf config set` works transparently
- `fs.existsSync` follows symlinks, so `resolveConfig()` falls back to defaults on broken symlinks
- No changes needed in `src/utils/config.ts`

<promise>COMPLETE</promise>
