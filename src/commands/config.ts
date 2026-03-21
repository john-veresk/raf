import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { createRunner } from '../core/runner-factory.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { logger } from '../utils/logger.js';
import {
  getConfigPath,
  formatModelDisplay,
  getModel,
  validateConfig,
  collectConfigValidationWarnings,
  ConfigValidationError,
  resetConfigCache,
  resolveConfig,
  saveConfig,
} from '../utils/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { UserConfig } from '../types/config.js';
import { createPresetCommand } from './preset.js';

/**
 * Load the config documentation markdown from src/prompts/config-docs.md.
 * Resolved relative to this file's location in the dist/ tree.
 */
function loadConfigDocs(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // From dist/commands/config.js -> ../../src/prompts/config-docs.md
  const docsPath = path.join(__dirname, '..', '..', 'src', 'prompts', 'config-docs.md');
  return fs.readFileSync(docsPath, 'utf-8');
}

/**
 * Read the current user config file contents, or a message indicating no file exists.
 */
function getCurrentConfigState(configPath: string): string {
  if (!fs.existsSync(configPath)) {
    return 'No config file exists yet. All settings use defaults. The file will be created at: ' + configPath;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return `Current config file (${configPath}):\n\`\`\`json\n${content}\`\`\``;
  } catch {
    return 'Config file exists but could not be read: ' + configPath;
  }
}

/**
 * Build the system prompt for the config editing session.
 */
function buildConfigSystemPrompt(configDocs: string, configState: string): string {
  return [
    'You are helping the user edit their RAF configuration.',
    'You have full permission to read and write ~/.raf/raf.config.json.',
    '',
    '# Current Config State',
    configState,
    '',
    '# Config Documentation',
    configDocs,
  ].join('\n');
}

/**
 * Validate the config file after the editing session ends and report results.
 */
function postSessionValidation(configPath: string): void {
  if (!fs.existsSync(configPath)) {
    logger.info('No config file exists — using all defaults.');
    return;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    validateConfig(parsed);
    logger.success('Config updated successfully.');

    // Show a summary of what's set
    const userConfig = parsed as Record<string, unknown>;
    const keys = Object.keys(userConfig);
    if (keys.length > 0) {
      logger.info(`Custom settings: ${keys.join(', ')}`);
    }
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      logger.warn(`Config validation warning: ${error.message}`);
      logger.warn('The file was not deleted — you can fix it manually or run `raf config wizard` again.');
    } else if (error instanceof SyntaxError) {
      logger.warn('Config file contains invalid JSON.');
      logger.warn('The file was not deleted — you can fix it manually or run `raf config wizard` again.');
    } else {
      logger.warn(`Could not validate config: ${error}`);
    }
  }
}

/**
 * Prompt the user for Y/N confirmation via readline.
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ---- Helper functions for nested config access ----

/**
 * Get a nested value from an object using dot notation.
 * Returns undefined if the path doesn't exist.
 */
function getNestedValue(obj: unknown, dotPath: string): unknown {
  const keys = dotPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation.
 * Creates intermediate objects as needed.
 */
function setNestedValue(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

/**
 * Delete a nested value from an object using dot notation.
 * Cleans up empty parent objects after deletion.
 */
function deleteNestedValue(obj: Record<string, unknown>, dotPath: string): void {
  const keys = dotPath.split('.');

  // Navigate to parent and delete the key
  if (keys.length === 1) {
    delete obj[keys[0]!];
    return;
  }

  // Build path to parent
  let current: Record<string, unknown> = obj;
  const path: Array<{ obj: Record<string, unknown>; key: string }> = [];

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    path.push({ obj: current, key });

    if (typeof current[key] !== 'object' || current[key] === null) {
      return; // Path doesn't exist
    }
    current = current[key] as Record<string, unknown>;
  }

  // Delete the leaf value
  const lastKey = keys[keys.length - 1]!;
  delete current[lastKey];

  // Clean up empty parents
  for (let i = path.length - 1; i >= 0; i--) {
    const { obj, key } = path[i]!;
    const child = obj[key] as Record<string, unknown>;
    if (Object.keys(child).length === 0) {
      delete obj[key];
    } else {
      break; // Stop if we find a non-empty parent
    }
  }
}

/**
 * Get the default value at a dot-notation path from DEFAULT_CONFIG.
 */
function getDefaultValue(dotPath: string): unknown {
  return getNestedValue(DEFAULT_CONFIG, dotPath);
}

/**
 * Parse a string value, attempting JSON.parse for numbers/booleans, falling back to string.
 */
function parseValue(value: string): unknown {
  // Try JSON.parse for numbers, booleans, null
  try {
    return JSON.parse(value);
  } catch {
    // Fall back to string
    return value;
  }
}

/**
 * Format a value for console output.
 * Strings are printed plain, objects/arrays as JSON.
 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

// ---- Config get/set handlers ----

/**
 * Print config value(s).
 */
function handleGet(key?: string): void {
  const config = resolveConfig();

  if (key === undefined) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  const value = getNestedValue(config, key);

  if (value === undefined) {
    logger.error(`Config key not found: ${key}`);
    process.exit(1);
  }

  console.log(formatValue(value));
}

/**
 * Update config file with a new value.
 */
function handleSet(key: string, rawValue: string): void {
  const value = parseValue(rawValue);
  const configPath = getConfigPath();

  // Read current user config (or start with empty)
  let userConfig: UserConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(content) as UserConfig;
    } catch (error) {
      logger.error(`Failed to read config file: ${error}`);
      process.exit(1);
    }
  }

  // Check if value matches default
  const defaultValue = getDefaultValue(key);

  if (defaultValue === undefined) {
    logger.error(`Config key not found in schema: ${key}`);
    process.exit(1);
  }

  // Deep equality check for objects
  const valuesMatch = JSON.stringify(value) === JSON.stringify(defaultValue);

  if (valuesMatch) {
    // Remove from config file (keep config minimal)
    deleteNestedValue(userConfig as Record<string, unknown>, key);
    logger.info(`Value matches default, removing ${key} from config`);
  } else {
    // Set the value
    setNestedValue(userConfig as Record<string, unknown>, key, value);
    logger.info(`Set ${key} = ${formatValue(value)}`);
  }

  // Validate the resulting config
  try {
    const validated = validateConfig(userConfig);
    for (const warning of collectConfigValidationWarnings(validated)) {
      logger.warn(`Config validation warning: ${warning}`);
    }
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      logger.error(`Validation error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  // Save or delete config file
  if (Object.keys(userConfig).length === 0) {
    // Config is empty, delete the file
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      logger.info('Config is empty, removed file');
    }
  } else {
    saveConfig(configPath, userConfig);
    logger.success('Config updated successfully');
  }
}

export function createConfigCommand(): Command {
  const command = new Command('config')
    .description('Manage RAF configuration with get, set, reset, wizard, and preset subcommands')
    .action(function(this: Command) {
      this.outputHelp();
    });

  command
    .addCommand(
      new Command('get')
        .description('Print the resolved config or one resolved dot-notation value')
        .argument('[key]', 'Optional dot-notation key to read')
        .action((key?: string) => {
          handleGet(key);
        })
    )
    .addCommand(
      new Command('set')
        .description('Write a config value using a dot-notation key')
        .argument('<key>', 'Dot-notation key to write')
        .argument('<value>', 'Value to write; parsed as JSON when possible')
        .action((key: string, value: string) => {
          handleSet(key, value);
        })
    )
    .addCommand(
      new Command('reset')
        .description('Delete the config file and restore all defaults')
        .action(async () => {
          await handleReset();
        })
    )
    .addCommand(
      new Command('wizard')
        .description('Launch the interactive config editor session')
        .argument('[prompt...]', 'Optional initial prompt for the config session')
        .action(async (promptParts: string[]) => {
          const initialPrompt = promptParts.length > 0 ? promptParts.join(' ') : undefined;
          await runConfigSession(initialPrompt);
        })
    )
    .addCommand(createPresetCommand());

  return command;
}

async function handleReset(): Promise<void> {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    logger.info('No config file exists — already using defaults.');
    return;
  }

  const confirmed = await confirm(
    'This will delete ~/.raf/raf.config.json and restore all defaults. Continue? [y/N] '
  );

  if (!confirmed) {
    logger.info('Cancelled.');
    return;
  }

  fs.unlinkSync(configPath);
  logger.success('Config file deleted. All settings restored to defaults.');
}

async function runConfigSession(initialPrompt?: string): Promise<void> {
  const configPath = getConfigPath();

  // Try to load config, but fall back to defaults if it's broken
  // This allows raf config wizard to be used to fix a broken config file
  let modelEntry: import('../types/config.js').ModelEntry;
  let configError: Error | null = null;

  try {
    modelEntry = getModel('config');
  } catch (error) {
    // Config file has errors - fall back to defaults so the session can launch
    configError = error instanceof Error ? error : new Error(String(error));
    modelEntry = DEFAULT_CONFIG.models.config;
    // Clear the cached config so subsequent calls don't use the broken cache
    resetConfigCache();
  }

  // Warn user if config has errors, before starting the session
  if (configError) {
    logger.warn(`Config file has errors, using defaults: ${configError.message}`);
    logger.warn('Fix the config in this session or run `raf config reset` to start fresh.');
    logger.newline();
  }

  // Load config docs
  let configDocs: string;
  try {
    configDocs = loadConfigDocs();
  } catch (error) {
    logger.error(`Failed to load config documentation: ${error}`);
    process.exit(1);
  }

  // Build system prompt
  const configState = getCurrentConfigState(configPath);
  const systemPrompt = buildConfigSystemPrompt(configDocs, configState);

  // Build user message
  const userMessage = initialPrompt
    ?? 'Show me my current config and help me make changes.';

  // Set up runner
  const claudeRunner = createRunner({ model: modelEntry.model, harness: modelEntry.harness, reasoningEffort: modelEntry.reasoningEffort, fast: modelEntry.fast });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  const configModel = formatModelDisplay(modelEntry.model);
  logger.info(`Starting config session with ${configModel}...`);
  logger.newline();

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: true,
    });

    if (exitCode !== 0) {
      logger.warn(`Process exited with code ${exitCode}`);
    }

    // Post-session validation
    logger.newline();
    postSessionValidation(configPath);
  } catch (error) {
    logger.error(`Config session failed: ${error}`);
    throw error;
  }
}
