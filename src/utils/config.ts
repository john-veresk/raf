import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  RafConfig,
  DEFAULT_CONFIG,
  DEFAULT_RAF_CONFIG,
  UserConfig,
  VALID_MODEL_ALIASES,
  FULL_MODEL_ID_PATTERN,
  VALID_EFFORTS,
  ClaudeModelName,
  EffortLevel,
  ModelScenario,
  EffortScenario,
  CommitFormatType,
  PricingCategory,
  ModelPricing,
  PricingConfig,
} from '../types/config.js';

const CONFIG_DIR = path.join(os.homedir(), '.raf');
const CONFIG_FILENAME = 'raf.config.json';

export function getConfigPath(): string {
  return path.join(CONFIG_DIR, CONFIG_FILENAME);
}

/**
 * Get the path to Claude CLI settings file.
 */
export function getClaudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

// ---- Validation ----

const VALID_TOP_LEVEL_KEYS = new Set<string>([
  'models', 'effort', 'timeout', 'maxRetries', 'autoCommit',
  'worktree', 'commitFormat', 'pricing',
]);

const VALID_PRICING_CATEGORIES = new Set<string>(['opus', 'sonnet', 'haiku']);
const VALID_PRICING_FIELDS = new Set<string>(['inputPerMTok', 'outputPerMTok', 'cacheReadPerMTok', 'cacheCreatePerMTok']);

const VALID_MODEL_KEYS = new Set<string>([
  'plan', 'execute', 'nameGeneration', 'failureAnalysis', 'prGeneration', 'config',
]);

const VALID_EFFORT_KEYS = new Set<string>([
  'plan', 'execute', 'nameGeneration', 'failureAnalysis', 'prGeneration', 'config',
]);

const VALID_COMMIT_FORMAT_KEYS = new Set<string>(['task', 'plan', 'amend', 'prefix']);

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function checkUnknownKeys(obj: Record<string, unknown>, validKeys: Set<string>, prefix: string): void {
  for (const key of Object.keys(obj)) {
    if (!validKeys.has(key)) {
      throw new ConfigValidationError(`Unknown config key: ${prefix ? `${prefix}.` : ''}${key}`);
    }
  }
}

/**
 * Check whether a string is a valid model name — either a short alias or a full model ID.
 */
export function isValidModelName(value: string): boolean {
  return (VALID_MODEL_ALIASES as readonly string[]).includes(value) || FULL_MODEL_ID_PATTERN.test(value);
}

export function validateConfig(config: unknown): UserConfig {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new ConfigValidationError('Config must be a JSON object');
  }

  const obj = config as Record<string, unknown>;
  checkUnknownKeys(obj, VALID_TOP_LEVEL_KEYS, '');

  // models
  if (obj.models !== undefined) {
    if (typeof obj.models !== 'object' || obj.models === null || Array.isArray(obj.models)) {
      throw new ConfigValidationError('models must be an object');
    }
    const models = obj.models as Record<string, unknown>;
    checkUnknownKeys(models, VALID_MODEL_KEYS, 'models');
    for (const [key, val] of Object.entries(models)) {
      if (typeof val !== 'string' || !isValidModelName(val)) {
        throw new ConfigValidationError(
          `models.${key} must be a short alias (${VALID_MODEL_ALIASES.join(', ')}) or a full model ID (e.g., claude-sonnet-4-5-20250929)`
        );
      }
    }
  }

  // effort
  if (obj.effort !== undefined) {
    if (typeof obj.effort !== 'object' || obj.effort === null || Array.isArray(obj.effort)) {
      throw new ConfigValidationError('effort must be an object');
    }
    const effort = obj.effort as Record<string, unknown>;
    checkUnknownKeys(effort, VALID_EFFORT_KEYS, 'effort');
    for (const [key, val] of Object.entries(effort)) {
      if (typeof val !== 'string' || !(VALID_EFFORTS as readonly string[]).includes(val)) {
        throw new ConfigValidationError(`effort.${key} must be one of: ${VALID_EFFORTS.join(', ')}`);
      }
    }
  }

  // timeout
  if (obj.timeout !== undefined) {
    if (typeof obj.timeout !== 'number' || obj.timeout <= 0 || !Number.isFinite(obj.timeout)) {
      throw new ConfigValidationError('timeout must be a positive number');
    }
  }

  // maxRetries
  if (obj.maxRetries !== undefined) {
    if (typeof obj.maxRetries !== 'number' || obj.maxRetries < 0 || !Number.isInteger(obj.maxRetries)) {
      throw new ConfigValidationError('maxRetries must be a non-negative integer');
    }
  }

  // autoCommit
  if (obj.autoCommit !== undefined) {
    if (typeof obj.autoCommit !== 'boolean') {
      throw new ConfigValidationError('autoCommit must be a boolean');
    }
  }

  // worktree
  if (obj.worktree !== undefined) {
    if (typeof obj.worktree !== 'boolean') {
      throw new ConfigValidationError('worktree must be a boolean');
    }
  }

  // commitFormat
  if (obj.commitFormat !== undefined) {
    if (typeof obj.commitFormat !== 'object' || obj.commitFormat === null || Array.isArray(obj.commitFormat)) {
      throw new ConfigValidationError('commitFormat must be an object');
    }
    const cf = obj.commitFormat as Record<string, unknown>;
    checkUnknownKeys(cf, VALID_COMMIT_FORMAT_KEYS, 'commitFormat');
    for (const [key, val] of Object.entries(cf)) {
      if (typeof val !== 'string') {
        throw new ConfigValidationError(`commitFormat.${key} must be a string`);
      }
    }
  }

  // pricing
  if (obj.pricing !== undefined) {
    if (typeof obj.pricing !== 'object' || obj.pricing === null || Array.isArray(obj.pricing)) {
      throw new ConfigValidationError('pricing must be an object');
    }
    const pricing = obj.pricing as Record<string, unknown>;
    checkUnknownKeys(pricing, VALID_PRICING_CATEGORIES, 'pricing');
    for (const [category, catVal] of Object.entries(pricing)) {
      if (typeof catVal !== 'object' || catVal === null || Array.isArray(catVal)) {
        throw new ConfigValidationError(`pricing.${category} must be an object`);
      }
      const fields = catVal as Record<string, unknown>;
      checkUnknownKeys(fields, VALID_PRICING_FIELDS, `pricing.${category}`);
      for (const [field, val] of Object.entries(fields)) {
        if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
          throw new ConfigValidationError(`pricing.${category}.${field} must be a non-negative number`);
        }
      }
    }
  }

  return config as UserConfig;
}

// ---- Deep merge ----

function deepMerge(defaults: RafConfig, overrides: UserConfig): RafConfig {
  const result = { ...defaults };

  if (overrides.models) {
    result.models = { ...defaults.models, ...overrides.models };
  }
  if (overrides.effort) {
    result.effort = { ...defaults.effort, ...overrides.effort };
  }
  if (overrides.commitFormat) {
    result.commitFormat = { ...defaults.commitFormat, ...overrides.commitFormat };
  }
  if (overrides.pricing) {
    result.pricing = {
      opus: { ...defaults.pricing.opus, ...overrides.pricing.opus },
      sonnet: { ...defaults.pricing.sonnet, ...overrides.pricing.sonnet },
      haiku: { ...defaults.pricing.haiku, ...overrides.pricing.haiku },
    };
  }
  if (overrides.timeout !== undefined) result.timeout = overrides.timeout;
  if (overrides.maxRetries !== undefined) result.maxRetries = overrides.maxRetries;
  if (overrides.autoCommit !== undefined) result.autoCommit = overrides.autoCommit;
  if (overrides.worktree !== undefined) result.worktree = overrides.worktree;

  return result;
}

// ---- Config loading ----

/**
 * Resolve the final config by loading from ~/.raf/raf.config.json and merging with defaults.
 * Throws ConfigValidationError if the file contains invalid values.
 */
export function resolveConfig(configPath?: string): RafConfig {
  const filePath = configPath ?? getConfigPath();

  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_CONFIG, models: { ...DEFAULT_CONFIG.models }, effort: { ...DEFAULT_CONFIG.effort }, commitFormat: { ...DEFAULT_CONFIG.commitFormat } };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);
  const validated = validateConfig(parsed);
  return deepMerge(DEFAULT_CONFIG, validated);
}

/**
 * @deprecated Use resolveConfig() instead. Kept for backward compatibility.
 */
export function loadConfig(_rafDir: string): { defaultTimeout: number; defaultMaxRetries: number; autoCommit: boolean } {
  return { ...DEFAULT_RAF_CONFIG };
}

export function saveConfig(configPath: string, config: UserConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// ---- Helper accessors ----

let _cachedConfig: RafConfig | null = null;

/**
 * Get the resolved config, caching the result for the process lifetime.
 * Call resetConfigCache() in tests to clear.
 */
export function getResolvedConfig(): RafConfig {
  if (!_cachedConfig) {
    _cachedConfig = resolveConfig();
  }
  return _cachedConfig;
}

export function resetConfigCache(): void {
  _cachedConfig = null;
}

export function getModel(scenario: ModelScenario): ClaudeModelName {
  return getResolvedConfig().models[scenario];
}

export function getEffort(scenario: EffortScenario): EffortLevel {
  return getResolvedConfig().effort[scenario];
}

export function getCommitFormat(type: CommitFormatType): string {
  return getResolvedConfig().commitFormat[type];
}

export function getCommitPrefix(): string {
  return getResolvedConfig().commitFormat.prefix;
}

export function getTimeout(): number {
  return getResolvedConfig().timeout;
}

export function getMaxRetries(): number {
  return getResolvedConfig().maxRetries;
}

export function getAutoCommit(): boolean {
  return getResolvedConfig().autoCommit;
}

export function getWorktreeDefault(): boolean {
  return getResolvedConfig().worktree;
}

/**
 * Extract the short model alias (opus, sonnet, haiku) from a model ID.
 * Works with both full model IDs (e.g., "claude-sonnet-4-5-20250929") and already-short names ("sonnet").
 * Returns the original string if no known alias can be extracted.
 */
export function getModelShortName(modelId: string): string {
  // Already a short alias
  if (modelId === 'opus' || modelId === 'sonnet' || modelId === 'haiku') {
    return modelId;
  }
  // Extract family from full model ID: claude-{family}-{version}
  const match = modelId.match(/^claude-([a-z]+)-/);
  if (match) {
    const family = match[1];
    if (family === 'opus' || family === 'sonnet' || family === 'haiku') {
      return family;
    }
  }
  // Unknown format, return as-is
  return modelId;
}

/**
 * Map a full model ID (e.g., `claude-opus-4-6`) or short alias to a pricing category.
 * Returns null if the model cannot be mapped.
 */
export function resolveModelPricingCategory(modelId: string): PricingCategory | null {
  // Short aliases map directly
  if (modelId === 'opus' || modelId === 'sonnet' || modelId === 'haiku') {
    return modelId;
  }
  // Full model IDs: extract family from `claude-{family}-{version}`
  const match = modelId.match(/^claude-([a-z]+)-/);
  if (match) {
    const family = match[1];
    if (family === 'opus' || family === 'sonnet' || family === 'haiku') {
      return family;
    }
  }
  return null;
}

/**
 * Get pricing config for a specific model category.
 */
export function getPricing(category: PricingCategory): ModelPricing {
  return getResolvedConfig().pricing[category];
}

/**
 * Get the full pricing config.
 */
export function getPricingConfig(): PricingConfig {
  return getResolvedConfig().pricing;
}

/**
 * Render a commit message template by replacing {placeholder} tokens with values.
 * Unknown placeholders are left as-is.
 */
export function renderCommitMessage(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export function getEditor(): string {
  return process.env['EDITOR'] ?? process.env['VISUAL'] ?? 'vi';
}

/**
 * Get the Claude model name from Claude CLI settings.
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
 * @deprecated Use getTimeout(), getMaxRetries(), getAutoCommit() instead.
 */
export function getConfig(): { timeout: number; maxRetries: number; autoCommit: boolean } {
  const config = getResolvedConfig();
  return {
    timeout: config.timeout,
    maxRetries: config.maxRetries,
    autoCommit: config.autoCommit,
  };
}
