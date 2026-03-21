import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import {
  getConfigPath,
  validateConfig,
  ConfigValidationError,
} from '../utils/config.js';

const PRESETS_DIR = path.join(os.homedir(), '.raf', 'presets');

function ensurePresetsDir(): void {
  if (!fs.existsSync(PRESETS_DIR)) {
    fs.mkdirSync(PRESETS_DIR, { recursive: true });
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
  if (!fs.existsSync(configPath)) {
    logger.error('No config file found. Run `raf config` to create one first.');
    process.exit(1);
  }

  const presetPath = getPresetPath(name);
  const configContent = fs.readFileSync(configPath, 'utf-8');

  // Validate the config before saving
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

  const existed = fs.existsSync(presetPath);
  fs.writeFileSync(presetPath, configContent);
  logger.info(`${existed ? 'Updated' : 'Saved'} preset "${name}" at ${presetPath}`);
}

function loadPreset(name: string): void {
  validatePresetName(name);
  const presetPath = getPresetPath(name);

  if (!fs.existsSync(presetPath)) {
    logger.error(`Preset "${name}" not found. Run \`raf preset list\` to see available presets.`);
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
  fs.writeFileSync(configPath, content);
  logger.info(`Loaded preset "${name}" into ${configPath}`);

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
    logger.info('No presets saved. Use `raf preset save <name>` to create one.');
    return;
  }

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
        const models = config.models as Record<string, { model?: string; provider?: string }>;
        const providers = new Set<string>();
        for (const entry of Object.values(models)) {
          if (entry?.provider) providers.add(entry.provider);
        }
        if (providers.size > 0) {
          summary.push(`providers: ${[...providers].join(', ')}`);
        }
        if (models.execute?.model) {
          summary.push(`execute: ${models.execute.model}`);
        }
      }

      const info = summary.length > 0 ? ` (${summary.join('; ')})` : '';
      logger.info(`  ${name}${info}`);
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

  fs.unlinkSync(presetPath);
  logger.info(`Deleted preset "${name}".`);
}

export function createPresetCommand(): Command {
  const preset = new Command('preset')
    .description('Save, load, list, and delete named config presets');

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
