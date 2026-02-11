import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { ClaudeRunner } from '../core/claude-runner.js';
import { shutdownHandler } from '../core/shutdown-handler.js';
import { logger } from '../utils/logger.js';
import {
  getConfigPath,
  getModel,
  getModelShortName,
  validateConfig,
  ConfigValidationError,
  resetConfigCache,
} from '../utils/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';

interface ConfigCommandOptions {
  reset?: boolean;
}

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
 * Build the system prompt for the config editing Claude session.
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
 * Validate the config file after the Claude session ends and report results.
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
      logger.warn('The file was not deleted — you can fix it manually or run `raf config` again.');
    } else if (error instanceof SyntaxError) {
      logger.warn('Config file contains invalid JSON.');
      logger.warn('The file was not deleted — you can fix it manually or run `raf config` again.');
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

export function createConfigCommand(): Command {
  const command = new Command('config')
    .description('View and edit RAF configuration with Claude')
    .argument('[prompt...]', 'Optional initial prompt for the config session')
    .option('--reset', 'Delete config file and restore all defaults')
    .action(async (promptParts: string[], options: ConfigCommandOptions) => {
      if (options.reset) {
        await handleReset();
        return;
      }

      const initialPrompt = promptParts.length > 0 ? promptParts.join(' ') : undefined;
      await runConfigSession(initialPrompt);
    });

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
  // This allows raf config to be used to fix a broken config file
  let model: string;
  let configError: Error | null = null;

  try {
    model = getModel('config');
  } catch (error) {
    // Config file has errors - fall back to defaults so the session can launch
    configError = error instanceof Error ? error : new Error(String(error));
    model = DEFAULT_CONFIG.models.config;
    // Clear the cached config so subsequent calls don't use the broken cache
    resetConfigCache();
  }

  // Warn user if config has errors, before starting the session
  if (configError) {
    logger.warn(`Config file has errors, using defaults: ${configError.message}`);
    logger.warn('Fix the config in this session or run `raf config --reset` to start fresh.');
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

  // Set up Claude runner
  const claudeRunner = new ClaudeRunner({ model });
  shutdownHandler.init();
  shutdownHandler.registerClaudeRunner(claudeRunner);

  const configModel = getModelShortName(model);
  logger.info(`Starting config session with ${configModel}...`);
  logger.newline();

  try {
    const exitCode = await claudeRunner.runInteractive(systemPrompt, userMessage, {
      dangerouslySkipPermissions: true,
    });

    if (exitCode !== 0) {
      logger.warn(`Claude exited with code ${exitCode}`);
    }

    // Post-session validation
    logger.newline();
    postSessionValidation(configPath);
  } catch (error) {
    logger.error(`Config session failed: ${error}`);
    throw error;
  }
}
