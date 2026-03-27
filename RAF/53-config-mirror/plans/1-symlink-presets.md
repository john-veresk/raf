---
effort: medium
---
# Task: Symlink-Based Preset Linking

## Objective
Change `raf config preset save` and `raf config preset load` to use symlinks, so that editing the active config always writes back to the linked preset.

## Context
Currently `preset save` copies config content into a preset file, and `preset load` copies it back. The user wants a linked model: `save` moves the config into presets and symlinks back, `load` switches the symlink to a different preset. This way `raf config set` always writes through to the active preset with zero sync logic.

**Flow:**
1. Fresh install — no config file, defaults used
2. `raf config set ...` — creates/edits regular `raf.config.json`
3. `raf config preset save my-preset` — moves `raf.config.json` to `presets/my-preset.json`, replaces it with a symlink
4. `raf config set ...` — writes through symlink to `presets/my-preset.json`
5. `raf config preset load other-preset` — switches symlink to `presets/other-preset.json`

## Requirements
- `raf config preset save <name>` moves `raf.config.json` to `presets/<name>.json` and replaces it with a symlink (if already symlinked, copies content to the new preset and re-symlinks)
- `raf config preset load <name>` replaces `raf.config.json` with a symlink to `~/.raf/presets/<name>.json`
- `raf config set` works transparently (writes through symlink to the preset file)
- `raf config get` (no key) prints a `(linked: <name>)` note when config is symlinked
- `raf config reset` deletes the symlink (not the target preset), restoring defaults
- `raf config preset delete <name>` warns/blocks if deleting the currently-linked preset
- `raf config preset list` marks the currently-linked preset in the output

## Implementation Steps

### 1. Add symlink detection helper in `src/commands/preset.ts`

Add a function `getLinkedPresetName()` that checks if `raf.config.json` is a symlink and, if so, resolves its target to extract the preset name:

```typescript
function getLinkedPresetName(): string | null {
  const configPath = getConfigPath();
  try {
    const stat = fs.lstatSync(configPath);
    if (!stat.isSymbolicLink()) return null;
    const target = fs.readlinkSync(configPath);
    const resolved = path.resolve(path.dirname(configPath), target);
    // Check if target is inside PRESETS_DIR
    if (!resolved.startsWith(PRESETS_DIR)) return null;
    const basename = path.basename(resolved, '.json');
    return basename;
  } catch {
    return null;
  }
}
```

Export this function so `config.ts` can use it too.

Also add a helper to remove an existing config path (regular file or symlink, including broken symlinks):

```typescript
function removeConfigIfExists(configPath: string): void {
  try {
    fs.lstatSync(configPath);  // detects symlinks even if broken
    fs.unlinkSync(configPath);
  } catch {
    // doesn't exist at all — fine
  }
}
```

### 2. Update `savePreset()` in `src/commands/preset.ts`

Change save to move-and-link. Two cases:

**Case A: `raf.config.json` is a regular file (not yet linked)**
- Read and validate the config content
- Write content to `presets/<name>.json`
- Delete `raf.config.json`
- Create symlink `raf.config.json` → `presets/<name>.json`

**Case B: `raf.config.json` is already a symlink (linked to another preset)**
- Read content through the symlink
- Write content to `presets/<name>.json`
- Remove old symlink
- Create new symlink `raf.config.json` → `presets/<name>.json`

**Case C: Saving to the same preset that's currently linked**
- Config is already a symlink to `presets/<name>.json`, and writes go directly there
- Log "Already linked to preset \<name\>" and return — nothing to do

```typescript
function savePreset(name: string): void {
  validatePresetName(name);
  ensurePresetsDir();

  const configPath = getConfigPath();
  const linked = getLinkedPresetName();

  // If already linked to this exact preset, nothing to do
  if (linked === name) {
    logger.info(`Already linked to preset "${name}" — config changes are saved automatically.`);
    return;
  }

  // Config must exist (as regular file or symlink to another preset)
  let configExists = false;
  try { fs.lstatSync(configPath); configExists = true; } catch {}
  if (!configExists) {
    logger.error('No config file found. Run `raf config wizard` or `raf config set <key> <value>` to create one first.');
    process.exit(1);
  }

  // Read content (follows symlink if linked to another preset)
  const configContent = fs.readFileSync(configPath, 'utf-8');

  // Validate before saving
  try {
    const parsed = JSON.parse(configContent);
    validateConfig(parsed);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      logger.error(`Current config is invalid: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const presetPath = getPresetPath(name);
  const existed = fs.existsSync(presetPath);

  // Write content to preset file
  fs.writeFileSync(presetPath, configContent);

  // Remove old config (regular file or old symlink) and create new symlink
  removeConfigIfExists(configPath);
  fs.symlinkSync(presetPath, configPath);

  logger.info(`${existed ? 'Updated' : 'Saved'} preset "${name}" and linked config to it.`);
}
```

### 3. Update `loadPreset()` in `src/commands/preset.ts`

Replace the file copy with symlink creation:

```typescript
function loadPreset(name: string): void {
  validatePresetName(name);
  const presetPath = getPresetPath(name);

  if (!fs.existsSync(presetPath)) {
    logger.error(`Preset "${name}" not found. Run \`raf config preset list\` to see available presets.`);
    process.exit(1);
  }

  // Validate preset before linking
  const content = fs.readFileSync(presetPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    logger.error(`Preset "${name}" contains invalid JSON.`);
    process.exit(1);
  }

  try {
    validateConfig(parsed);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      logger.error(`Preset "${name}" is invalid: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Remove existing config (file or symlink)
  removeConfigIfExists(configPath);

  // Create symlink: raf.config.json -> presets/<name>.json
  fs.symlinkSync(presetPath, configPath);
  logger.info(`Linked config to preset "${name}"`);

  // Show a brief summary
  const config = parsed as Record<string, unknown>;
  const keys = Object.keys(config);
  if (keys.length > 0) {
    logger.info(`  Keys: ${keys.join(', ')}`);
  }
}
```

### 4. Update `deletePreset()` in `src/commands/preset.ts`

Before deleting, check if the preset is the currently-linked one. If so, remove the symlink first:

```typescript
function deletePreset(name: string): void {
  validatePresetName(name);
  const presetPath = getPresetPath(name);

  if (!fs.existsSync(presetPath)) {
    logger.error(`Preset "${name}" not found.`);
    process.exit(1);
  }

  const linked = getLinkedPresetName();
  if (linked === name) {
    // Remove symlink first so config falls back to defaults
    const configPath = getConfigPath();
    fs.unlinkSync(configPath);
    logger.warn(`Unlinked config from preset "${name}" (config reset to defaults).`);
  }

  fs.unlinkSync(presetPath);
  logger.info(`Deleted preset "${name}".`);
}
```

### 5. Update `listPresets()` in `src/commands/preset.ts`

Show which preset is currently linked:

```typescript
const linked = getLinkedPresetName();
// In the loop:
const marker = (name === linked) ? ' (linked)' : '';
logger.info(`  ${name}${info}${marker}`);
```

### 6. Update `handleGet()` in `src/commands/config.ts`

When printing the full config (no key argument), check if config is symlinked and print a note:

```typescript
import { getLinkedPresetName } from './preset.js';

function handleGet(key?: string): void {
  const linked = getLinkedPresetName();
  if (key === undefined) {
    if (linked) {
      logger.info(`(linked: ${linked})`);
    }
    const config = resolveConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  // ... rest unchanged
}
```

### 7. Update `handleReset()` in `src/commands/config.ts`

Update the confirmation message to mention unlinking when relevant:

```typescript
async function handleReset(): Promise<void> {
  const configPath = getConfigPath();
  const linked = getLinkedPresetName();

  // Check for symlink OR regular file
  let exists = false;
  try { fs.lstatSync(configPath); exists = true; } catch {}

  if (!exists) {
    logger.info('No config file exists — already using defaults.');
    return;
  }

  const message = linked
    ? `This will unlink preset "${linked}" and restore defaults. Continue? [y/N] `
    : 'This will delete ~/.raf/raf.config.json and restore all defaults. Continue? [y/N] ';

  const confirmed = await confirm(message);
  if (!confirmed) { logger.info('Cancelled.'); return; }

  fs.unlinkSync(configPath);  // Removes symlink (not target) or regular file
  logger.success(linked
    ? `Unlinked from preset "${linked}". All settings restored to defaults.`
    : 'Config file deleted. All settings restored to defaults.'
  );
}
```

### 8. No changes needed in `src/utils/config.ts`

- `resolveConfig()` uses `fs.existsSync` which follows symlinks — reads the preset file correctly.
- `saveConfig()` uses `fs.writeFileSync` which follows symlinks — writes to the preset file correctly.
- A broken symlink (manually deleted preset) causes `fs.existsSync` to return false → falls back to defaults silently. Acceptable.

## Acceptance Criteria
- [ ] `raf config preset save my-preset` moves config to `presets/my-preset.json` and creates symlink
- [ ] `raf config preset save my-preset` when already linked to `my-preset` is a no-op with a helpful message
- [ ] `raf config preset save other` when linked to `my-preset` copies content to `presets/other.json` and re-symlinks
- [ ] `raf config preset load my-preset` creates a symlink `~/.raf/raf.config.json -> ~/.raf/presets/my-preset.json`
- [ ] `raf config set timeout 90` after save/load writes to the preset file
- [ ] `raf config get` shows `(linked: my-preset)` when symlinked
- [ ] `raf config reset` removes the symlink without deleting the preset file
- [ ] `raf config preset list` shows `(linked)` marker next to the active preset
- [ ] `raf config preset delete` on the linked preset unlinks first, then deletes
- [ ] Broken symlink (preset file manually deleted) gracefully falls back to defaults

## Notes
- `fs.unlinkSync` on a symlink removes the link itself, not the target — critical for `reset` and `delete`.
- `fs.writeFileSync` follows symlinks — this is what makes `raf config set` work transparently.
- `fs.existsSync` follows symlinks — use `fs.lstatSync` to detect the symlink itself (e.g., broken symlinks).
- On Windows, `fs.symlinkSync` may require elevated privileges. Acceptable since RAF targets macOS/Linux.
