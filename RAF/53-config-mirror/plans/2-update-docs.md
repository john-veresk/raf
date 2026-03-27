---
effort: low
---
# Task: Update Documentation for Symlink-Based Presets

## Objective
Update README.md and `src/prompts/config-docs.md` to reflect the new symlink-based preset save/load behavior.

## Context
Task 1 changes both `preset save` (move-and-link) and `preset load` (switch symlink). The docs need to explain the full flow: save creates a preset and links to it, load switches the link, edits flow back automatically.

## Dependencies
1

## Requirements
- README.md preset section reflects symlink behavior for both save and load
- `src/prompts/config-docs.md` preset section reflects symlink behavior
- Config wizard instructions updated so the LLM knows about symlinks

## Implementation Steps

### 1. Update README.md

Find the preset CLI reference section (around lines 121-124) and update:

```markdown
raf config preset save claude-setup    # Save config as "claude-setup" and link to it
raf config preset load claude-setup    # Switch config link to "claude-setup" preset
raf config preset list                 # Show all saved presets (marks linked preset)
raf config preset delete claude-setup  # Remove a preset (unlinks if active)
```

Update the preset table (around lines 270-273):

| Subcommand | Description |
|---|---|
| `preset save <name>` | Save current config as a named preset and link to it (edits flow back) |
| `preset load <name>` | Switch config link to a different preset |
| `preset list` | List all saved presets (marks the currently linked preset) |
| `preset delete <name>` | Delete a preset (unlinks first if it's the active preset) |

### 2. Update `src/prompts/config-docs.md`

Update the "presets" section (lines 206-218) to explain the full flow:

```markdown
### `presets` — Named Config Snapshots

Presets are named config files that you can save and link to. Once linked, config edits automatically persist back to the preset.

- **Storage**: `~/.raf/presets/<name>.json` — same format as `~/.raf/raf.config.json`
- **Flow**:
  1. `raf config set ...` creates a regular `~/.raf/raf.config.json`
  2. `raf config preset save <name>` moves the file to `presets/<name>.json` and symlinks `raf.config.json` to it
  3. From now on, `raf config set ...` writes directly to the preset file via the symlink
  4. `raf config preset load <other>` switches the symlink to a different preset
- **CLI commands**:
  - `raf config preset save <name>` — move config into a preset and link to it
  - `raf config preset load <name>` — switch the link to a different preset
  - `raf config preset list` — list all saved presets (marks the linked one)
  - `raf config preset delete <name>` — delete a preset (unlinks first if active)
- **Unlinking**: `raf config reset` removes the symlink and restores defaults. The preset file is not deleted.
- **Status**: `raf config get` shows `(linked: <name>)` when config is symlinked to a preset.
- **Name rules**: alphanumeric characters, hyphens, and underscores only (`^[a-zA-Z0-9_-]+$`)
```

Update the "Managing Presets" section in the Config Editing Session Instructions (lines 492-501). This section is critical — the config wizard LLM manages presets via direct file operations, so it must understand how symlinks work:

```markdown
### Managing Presets

Presets are stored at `~/.raf/presets/<name>.json`. After saving or loading a preset, `~/.raf/raf.config.json` is a **symlink** to the preset file — edits write through automatically.

#### Symlink Rules

When managing presets via file operations, you MUST follow these rules:

1. **Detect link state first**: Before any preset operation, check if `~/.raf/raf.config.json` is a symlink using `fs.lstatSync()`. `fs.existsSync()` follows symlinks and won't tell you if the path is a symlink.
2. **Reading config**: `fs.readFileSync()` follows symlinks automatically — just read `~/.raf/raf.config.json` as normal.
3. **Writing config**: `fs.writeFileSync()` follows symlinks — writes go to the preset file. This is correct behavior.
4. **Removing config**: `fs.unlinkSync()` on a symlink removes the **link itself**, not the target preset file.
5. **Broken symlinks**: If `~/.raf/raf.config.json` is a symlink but the target preset was deleted, `fs.existsSync()` returns false. Use `fs.lstatSync()` to detect this. Treat broken symlinks as "no config" (defaults).

#### Preset Operations

- **Save a preset** (`raf config preset save <name>`):
  1. Read config content from `~/.raf/raf.config.json` (follows symlink if linked)
  2. If already linked to the same preset name → no-op, tell the user
  3. Validate content, write to `~/.raf/presets/<name>.json`
  4. Remove `~/.raf/raf.config.json` (regular file or old symlink)
  5. Create symlink: `~/.raf/raf.config.json` → `~/.raf/presets/<name>.json`

- **Load a preset** (`raf config preset load <name>`):
  1. Validate `~/.raf/presets/<name>.json` exists and contains valid config
  2. Remove `~/.raf/raf.config.json` (regular file or old symlink)
  3. Create symlink: `~/.raf/raf.config.json` → `~/.raf/presets/<name>.json`

- **List presets**: Read `~/.raf/presets/` directory. Check if `~/.raf/raf.config.json` is a symlink pointing into `~/.raf/presets/` — if so, mark that preset as `(linked)`.

- **Delete a preset**: If the preset is currently linked (symlink target), remove the symlink at `~/.raf/raf.config.json` first. Then delete `~/.raf/presets/<name>.json`.

- **Unlink** (restore defaults): Remove the symlink at `~/.raf/raf.config.json`. The preset file is NOT deleted. Config falls back to defaults.
```

Update the "Common User Requests" section to reflect new behavior:

- **"Save this as a preset"** — Ask for a name, save content to `~/.raf/presets/<name>.json`, create symlink from `~/.raf/raf.config.json`
- **"Load preset X"** — Switch symlink from `~/.raf/raf.config.json` to `~/.raf/presets/X.json`
- **"Unlink preset"** — Remove the symlink at `~/.raf/raf.config.json` to restore defaults

## Acceptance Criteria
- [ ] README.md preset section describes save-and-link and load-as-switch behavior
- [ ] `src/prompts/config-docs.md` presets section explains the full flow (set → save → linked → load switches)
- [ ] Config wizard instructions explain symlink-aware preset management
- [ ] No stale references to "overwrites current config" or "copy" semantics remain in preset docs

## Notes
- Keep explanations practical — users don't need to know implementation details of symlinks, just that "saving a preset links it, so edits flow back automatically."
- The config wizard LLM instructions matter because the wizard can manage presets directly via file operations.
