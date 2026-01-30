import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { RafConfig, DEFAULT_RAF_CONFIG } from '../types/config.js';

const CONFIG_FILENAME = 'raf.config.json';

/**
 * Get the path to Claude CLI settings file.
 */
export function getClaudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

export function loadConfig(rafDir: string): RafConfig {
  const configPath = path.join(rafDir, CONFIG_FILENAME);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_RAF_CONFIG };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<RafConfig>;
    return { ...DEFAULT_RAF_CONFIG, ...userConfig };
  } catch {
    return { ...DEFAULT_RAF_CONFIG };
  }
}

export function saveConfig(rafDir: string, config: RafConfig): void {
  const configPath = path.join(rafDir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getEditor(): string {
  return process.env['EDITOR'] ?? process.env['VISUAL'] ?? 'vi';
}

/**
 * Get the Claude model name from Claude CLI settings.
 * Returns the model name or null if not found.
 * @param settingsPath Optional path to settings file (for testing)
 */
export function getClaudeModel(settingsPath?: string): string | null {
  const filePath = settingsPath ?? getClaudeSettingsPath();
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const settings = JSON.parse(content) as { model?: string };
    return settings.model ?? null;
  } catch {
    return null;
  }
}

/**
 * Get runtime configuration for task execution.
 * Returns default values which can be overridden by command line options.
 */
export function getConfig(): { timeout: number; maxRetries: number; autoCommit: boolean } {
  return {
    timeout: DEFAULT_RAF_CONFIG.defaultTimeout,
    maxRetries: DEFAULT_RAF_CONFIG.defaultMaxRetries,
    autoCommit: DEFAULT_RAF_CONFIG.autoCommit,
  };
}
