import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import type { UserConfig } from '../types/config.js';
import {
  getConfigPath,
  saveConfig,
  stripLegacyConfig,
  validateConfig,
  ConfigValidationError,
} from '../utils/config.js';

const PRESETS_DIR = path.join(os.homedir(), '.raf', 'presets');

function ensurePresetsDir(): void {
  if (!fs.existsSync(PRESETS_DIR)) {
    fs.mkdirSync(PRESETS_DIR, { recursive: true });
  }
}

export function getLinkedPresetName(): string | null {
  const configPath = getConfigPath();
  try {
    const stat = fs.lstatSync(configPath);
    if (!stat.isSymbolicLink()) return null;
    const target = fs.readlinkSync(configPath);
    const resolved = path.resolve(path.dirname(configPath), target);
    if (!resolved.startsWith(PRESETS_DIR)) return null;
    return path.basename(resolved, '.json');
  } catch {
    return null;
  }
}

function removeConfigIfExists(configPath: string): void {
  try {
    fs.lstatSync(configPath);
    fs.unlinkSync(configPath);
  } catch {
    // doesn't exist — fine
  }
}

function getPresetPath(name: string): string {
  return path.join(PRESETS_DIR, `${name}.json`);
}

function validatePresetName(name: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    logger.error('Preset name must contain only letters, numbers, hyphens, and underscores.');
    process.exit(1);
  }
}

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

  // Validate the config before saving
  let normalized: UserConfig;
  try {
    normalized = stripLegacyConfig(JSON.parse(configContent));
    validateConfig(normalized);
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
  saveConfig(presetPath, normalized);

  // Remove old config (regular file or old symlink) and create new symlink
  removeConfigIfExists(configPath);
  fs.symlinkSync(presetPath, configPath);

  logger.info(`${existed ? 'Updated' : 'Saved'} preset "${name}" and linked config to it.`);
}

function loadPreset(name: string): void {
  validatePresetName(name);
  const presetPath = getPresetPath(name);

  if (!fs.existsSync(presetPath)) {
    logger.error(`Preset "${name}" not found. Run \`raf config preset list\` to see available presets.`);
    process.exit(1);
  }

  const content = fs.readFileSync(presetPath, 'utf-8');

  // Validate preset before applying
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    logger.error(`Preset "${name}" contains invalid JSON.`);
    process.exit(1);
  }

  try {
    parsed = stripLegacyConfig(parsed);
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

  // Remove existing config (file or symlink) and create symlink
  removeConfigIfExists(configPath);
  fs.symlinkSync(presetPath, configPath);
  logger.info(`Linked config to preset "${name}"`);

  // Show a brief summary of what was loaded
  const config = parsed as Record<string, unknown>;
  const keys = Object.keys(config);
  if (keys.length > 0) {
    logger.info(`  Keys: ${keys.join(', ')}`);
  }
}

function listPresets(): void {
  ensurePresetsDir();

  const files = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    logger.info('No presets saved. Use `raf config preset save <name>` to create one.');
    return;
  }

  const linked = getLinkedPresetName();

  logger.info(`Found ${files.length} preset(s):\n`);
  for (const file of files) {
    const name = path.basename(file, '.json');
    const filePath = path.join(PRESETS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as Record<string, unknown>;

      // Build a brief summary from models
      const summary: string[] = [];
      if (config.models && typeof config.models === 'object') {
        const models = config.models as Record<string, { model?: string; harness?: string }>;
        const harnesses = new Set<string>();
        for (const entry of Object.values(models)) {
          if (entry?.harness) harnesses.add(entry.harness);
        }
        if (harnesses.size > 0) {
          summary.push(`harnesses: ${[...harnesses].join(', ')}`);
        }
        if (models.execute?.model) {
          summary.push(`execute: ${models.execute.model}`);
        }
      }

      const info = summary.length > 0 ? ` (${summary.join('; ')})` : '';
      const marker = (name === linked) ? ' (linked)' : '';
      logger.info(`  ${name}${info}${marker}`);
    } catch {
      logger.info(`  ${name} (invalid JSON)`);
    }
  }
}

function deletePreset(name: string): void {
  validatePresetName(name);
  const presetPath = getPresetPath(name);

  if (!fs.existsSync(presetPath)) {
    logger.error(`Preset "${name}" not found.`);
    process.exit(1);
  }

  const linked = getLinkedPresetName();
  if (linked === name) {
    const configPath = getConfigPath();
    fs.unlinkSync(configPath);
    logger.warn(`Unlinked config from preset "${name}" (config reset to defaults).`);
  }

  fs.unlinkSync(presetPath);
  logger.info(`Deleted preset "${name}".`);
}

export function createPresetCommand(): Command {
  const preset = new Command('preset')
    .description('Manage named config presets under `raf config preset`');

  preset
    .command('save <name>')
    .description('Save current config as a named preset')
    .action((name: string) => savePreset(name));

  preset
    .command('load <name>')
    .description('Load a preset into the active config (overwrites current config)')
    .action((name: string) => loadPreset(name));

  preset
    .command('list')
    .description('List all saved presets')
    .action(() => listPresets());

  preset
    .command('delete <name>')
    .description('Delete a saved preset')
    .action((name: string) => deletePreset(name));

  return preset;
}
