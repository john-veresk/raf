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
  ClaudeModelName,
  TaskEffortLevel,
  ModelScenario,
  CommitFormatType,
  DisplayConfig,
  EffortMappingConfig,
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
  'models', 'effortMapping', 'timeout', 'maxRetries', 'autoCommit',
  'worktree', 'syncMainBranch', 'commitFormat', 'display',
]);

const VALID_MODEL_KEYS = new Set<string>([
  'plan', 'execute', 'nameGeneration', 'failureAnalysis', 'prGeneration', 'config',
]);

const VALID_EFFORT_MAPPING_KEYS = new Set<string>(['low', 'medium', 'high']);

const VALID_COMMIT_FORMAT_KEYS = new Set<string>(['task', 'plan', 'amend', 'prefix']);

const VALID_DISPLAY_KEYS = new Set<string>(['showCacheTokens']);

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

  // effortMapping
  if (obj.effortMapping !== undefined) {
    if (typeof obj.effortMapping !== 'object' || obj.effortMapping === null || Array.isArray(obj.effortMapping)) {
      throw new ConfigValidationError('effortMapping must be an object');
    }
    const effortMapping = obj.effortMapping as Record<string, unknown>;
    checkUnknownKeys(effortMapping, VALID_EFFORT_MAPPING_KEYS, 'effortMapping');
    for (const [key, val] of Object.entries(effortMapping)) {
      if (typeof val !== 'string' || !isValidModelName(val)) {
        throw new ConfigValidationError(
          `effortMapping.${key} must be a short alias (${VALID_MODEL_ALIASES.join(', ')}) or a full model ID (e.g., claude-sonnet-4-5-20250929)`
        );
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

  // syncMainBranch
  if (obj.syncMainBranch !== undefined) {
    if (typeof obj.syncMainBranch !== 'boolean') {
      throw new ConfigValidationError('syncMainBranch must be a boolean');
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

  // display
  if (obj.display !== undefined) {
    if (typeof obj.display !== 'object' || obj.display === null || Array.isArray(obj.display)) {
      throw new ConfigValidationError('display must be an object');
    }
    const display = obj.display as Record<string, unknown>;
    checkUnknownKeys(display, VALID_DISPLAY_KEYS, 'display');
    for (const [key, val] of Object.entries(display)) {
      if (typeof val !== 'boolean') {
        throw new ConfigValidationError(`display.${key} must be a boolean`);
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
  if (overrides.effortMapping) {
    result.effortMapping = { ...defaults.effortMapping, ...overrides.effortMapping };
  }
  if (overrides.commitFormat) {
    result.commitFormat = { ...defaults.commitFormat, ...overrides.commitFormat };
  }
  if (overrides.display) {
    result.display = { ...defaults.display, ...overrides.display };
  }
  if (overrides.timeout !== undefined) result.timeout = overrides.timeout;
  if (overrides.maxRetries !== undefined) result.maxRetries = overrides.maxRetries;
  if (overrides.autoCommit !== undefined) result.autoCommit = overrides.autoCommit;
  if (overrides.worktree !== undefined) result.worktree = overrides.worktree;
  if (overrides.syncMainBranch !== undefined) result.syncMainBranch = overrides.syncMainBranch;

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
    return {
      ...DEFAULT_CONFIG,
      models: { ...DEFAULT_CONFIG.models },
      effortMapping: { ...DEFAULT_CONFIG.effortMapping },
      commitFormat: { ...DEFAULT_CONFIG.commitFormat },
      display: { ...DEFAULT_CONFIG.display },
    };
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

/**
 * Get the full effort mapping config.
 */
export function getEffortMapping(): EffortMappingConfig {
  return getResolvedConfig().effortMapping;
}

/**
 * Resolve a task effort level to a model name using the effort mapping config.
 */
export function resolveEffortToModel(effort: TaskEffortLevel): ClaudeModelName {
  return getResolvedConfig().effortMapping[effort];
}

/**
 * Model tier ordering for ceiling comparison.
 * Higher tier = more capable/expensive model.
 * haiku (1) < sonnet (2) < opus (3)
 */
const MODEL_TIER_ORDER: Record<string, number> = {
  haiku: 1,
  sonnet: 2,
  opus: 3,
};

/**
 * Get the numeric tier of a model for comparison.
 * Extracts family from full model IDs (e.g., 'claude-opus-4-6' -> 3).
 * Unknown models default to highest tier (3) so they're never accidentally capped.
 */
export function getModelTier(modelName: string): number {
  // Check short aliases first
  const tier = MODEL_TIER_ORDER[modelName];
  if (tier !== undefined) {
    return tier;
  }

  // Extract family from full model ID
  const match = modelName.match(/^claude-([a-z]+)-/);
  if (match && match[1]) {
    const familyTier = MODEL_TIER_ORDER[match[1]];
    if (familyTier !== undefined) {
      return familyTier;
    }
  }

  // Unknown model - default to highest tier (no cap)
  return 3;
}

/**
 * Apply ceiling to a model based on the configured models.execute ceiling.
 * Returns the lower-tier model between the input and the ceiling.
 */
export function applyModelCeiling(resolvedModel: string, ceiling?: string): string {
  const ceilingModel = ceiling ?? getModel('execute');
  const resolvedTier = getModelTier(resolvedModel);
  const ceilingTier = getModelTier(ceilingModel);

  // If resolved model is above ceiling, use ceiling instead
  if (resolvedTier > ceilingTier) {
    return ceilingModel;
  }
  return resolvedModel;
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

export function getSyncMainBranch(): boolean {
  return getResolvedConfig().syncMainBranch;
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
 * Mapping of short model aliases to their current full model IDs.
 * These should match the latest Claude model versions.
 */
const MODEL_ALIAS_TO_FULL_ID: Record<string, string> = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-5-20250929',
  haiku: 'claude-haiku-4-5-20251001',
};

/**
 * Resolve a model name to its full model ID.
 * If already a full model ID, returns as-is.
 * If a short alias (opus, sonnet, haiku), returns the corresponding full ID.
 */
export function resolveFullModelId(modelName: string): string {
  const fullId = MODEL_ALIAS_TO_FULL_ID[modelName];
  if (fullId) {
    return fullId;
  }
  // Already a full ID or unknown, return as-is
  return modelName;
}

/**
 * Get the full display config.
 */
export function getDisplayConfig(): DisplayConfig {
  return getResolvedConfig().display;
}

/**
 * Get whether to show cache tokens in summaries.
 */
export function getShowCacheTokens(): boolean {
  return getResolvedConfig().display.showCacheTokens;
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
