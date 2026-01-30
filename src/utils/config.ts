import * as fs from 'node:fs';
import * as path from 'node:path';
import { RafConfig, DEFAULT_RAF_CONFIG } from '../types/config.js';

const CONFIG_FILENAME = 'raf.config.json';

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
