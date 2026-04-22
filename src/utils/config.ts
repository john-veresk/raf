import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  RafConfig,
  DEFAULT_CONFIG,
  DEFAULT_RAF_CONFIG,
  UserConfig,
  VALID_MODEL_ALIASES,
  VALID_CODEX_MODEL_ALIASES,
  VALID_HARNESSES,
  FULL_MODEL_ID_PATTERN,
  TaskEffortLevel,
  ModelScenario,
  ModelEntry,
  CommitFormatType,
  EffortMappingConfig,
  HarnessName,
  CodexExecutionMode,
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
  'models', 'effortMapping', 'codex', 'display', 'context',
  'timeout', 'maxRetries', 'autoCommit',
  'worktree', 'syncMainBranch', 'pushOnComplete', 'commitFormat',
  'rateLimitWaitDefault',
]);

/** Keys that were removed in the schema migration. Rejected with a helpful error. */
const REMOVED_KEYS: Record<string, string> = {
  provider: 'Top-level "provider" has been removed. Use "harness" inside each "models" and "effortMapping" entry instead.',
  codexModels: '"codexModels" has been removed. Use "models" with harness-aware entries (e.g. { "model": "gpt-5.4", "harness": "codex" }) instead.',
  codexEffortMapping: '"codexEffortMapping" has been removed. Use "effortMapping" with harness-aware entries instead.',
  councilMode: '"councilMode" has been removed.',
};

const VALID_MODEL_KEYS = new Set<string>([
  'plan', 'execute', 'nameGeneration', 'failureAnalysis', 'prGeneration', 'config', 'merge',
]);

const VALID_EFFORT_MAPPING_KEYS = new Set<string>(['low', 'medium', 'high']);

const VALID_COMMIT_FORMAT_KEYS = new Set<string>(['task', 'plan', 'amend', 'merge', 'prefix']);

const VALID_MODEL_ENTRY_KEYS = new Set<string>(['model', 'harness', 'reasoningEffort', 'fast']);

const VALID_CODEX_KEYS = new Set<string>(['executionMode']);
const VALID_DISPLAY_KEYS = new Set<string>(['statusProjectLimit']);
const VALID_CONTEXT_KEYS = new Set<string>([
  'maxCompletedTasks',
  'maxPendingTasks',
  'maxDecisionItems',
  'recentOutcomeLimit',
  'goalMaxChars',
  'outcomeSummaryMaxChars',
]);

const VALID_REASONING_EFFORTS = new Set<string>(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

const VALID_CODEX_EXECUTION_MODES = new Set<string>(['dangerous', 'fullAuto']);

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function checkUnknownKeys(obj: Record<string, unknown>, validKeys: Set<string>, prefix: string): void {
  for (const key of Object.keys(obj)) {
    if (!validKeys.has(key)) {
      throw new ConfigValidationError(`Unknown config key: ${prefix ? `${prefix}.` : ''}${key}`);
    }
  }
}

/** Regex for raw Codex model IDs (e.g., `gpt-5.4`, `gpt-5.3-codex`). Requires dot-separated version. */
const CODEX_MODEL_ID_PATTERN = /^gpt-\d+\.\d+(-.+)*$/;

/**
 * Check whether a string is a valid model name.
 * Accepts:
 * - Claude short aliases: sonnet, haiku, opus
 * - Claude full IDs: claude-opus-4-6
 * - Codex short aliases: codex, gpt54
 * - Raw Codex model IDs: gpt-5.4, gpt-5.3-codex
 * - Harness-prefixed format: claude/opus, codex/gpt-5.4
 */
export function isValidModelName(value: string): boolean {
  // Harness-prefixed format: harness/model
  const prefixMatch = value.match(/^(claude|codex)\/(.+)$/);
  if (prefixMatch) {
    const [, harness, model] = prefixMatch;
    if (harness === 'claude') {
      return (VALID_MODEL_ALIASES as readonly string[]).includes(model!) || FULL_MODEL_ID_PATTERN.test(model!);
    }
    if (harness === 'codex') {
      return (VALID_CODEX_MODEL_ALIASES as readonly string[]).includes(model!) || CODEX_MODEL_ID_PATTERN.test(model!);
    }
  }

  // Unprefixed: Claude aliases and full IDs
  if ((VALID_MODEL_ALIASES as readonly string[]).includes(value) || FULL_MODEL_ID_PATTERN.test(value)) {
    return true;
  }

  // Unprefixed: Codex aliases and raw IDs
  if ((VALID_CODEX_MODEL_ALIASES as readonly string[]).includes(value) || CODEX_MODEL_ID_PATTERN.test(value)) {
    return true;
  }

  return false;
}

/**
 * Parse a model spec string into its harness and model components.
 * - `codex/gpt-5.4` -> { harness: 'codex', model: 'gpt-5.4' }
 * - `claude/opus` -> { harness: 'claude', model: 'opus' }
 * - `opus` -> { harness: 'claude', model: 'opus' } (defaults to claude)
 * - `gpt-5.4` -> { harness: 'codex', model: 'gpt-5.4' } (inferred from model format)
 */
export function parseModelSpec(modelSpec: string): { harness: HarnessName; model: string } {
  const prefixMatch = modelSpec.match(/^(claude|codex)\/(.+)$/);
  if (prefixMatch) {
    return { harness: prefixMatch[1] as HarnessName, model: prefixMatch[2]! };
  }

  // Infer harness from model format
  if ((VALID_CODEX_MODEL_ALIASES as readonly string[]).includes(modelSpec) || CODEX_MODEL_ID_PATTERN.test(modelSpec)) {
    return { harness: 'codex', model: modelSpec };
  }

  // Default to claude
  return { harness: 'claude', model: modelSpec };
}

/**
 * Validate a model entry object: { model, harness, reasoningEffort?, fast? }
 */
function validateModelEntry(obj: unknown, prefix: string): void {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new ConfigValidationError(`${prefix} must be a model entry object (e.g. { "model": "opus", "harness": "claude" })`);
  }
  const entry = obj as Record<string, unknown>;
  checkUnknownKeys(entry, VALID_MODEL_ENTRY_KEYS, prefix);

  if (entry.model === undefined) {
    throw new ConfigValidationError(`${prefix}.model is required`);
  }
  if (typeof entry.model !== 'string' || !isValidModelName(entry.model)) {
    throw new ConfigValidationError(
      `${prefix}.model must be a valid model name (e.g. opus, sonnet, gpt-5.4, claude-opus-4-6)`
    );
  }

  if (entry.harness === undefined) {
    throw new ConfigValidationError(`${prefix}.harness is required`);
  }
  if (typeof entry.harness !== 'string' || !(VALID_HARNESSES as readonly string[]).includes(entry.harness)) {
    throw new ConfigValidationError(`${prefix}.harness must be one of: ${VALID_HARNESSES.join(', ')}`);
  }

  if (entry.reasoningEffort !== undefined) {
    if (typeof entry.reasoningEffort !== 'string' || !VALID_REASONING_EFFORTS.has(entry.reasoningEffort)) {
      throw new ConfigValidationError(`${prefix}.reasoningEffort must be one of: none, minimal, low, medium, high, xhigh, max`);
    }
  }

  if (entry.fast !== undefined) {
    if (typeof entry.fast !== 'boolean') {
      throw new ConfigValidationError(`${prefix}.fast must be a boolean`);
    }
    if (entry.harness !== 'codex') {
      throw new ConfigValidationError(`${prefix}.fast is only supported when harness is "codex"`);
    }
  }
}

export function validateConfig(config: unknown): UserConfig {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new ConfigValidationError('Config must be a JSON object');
  }

  const obj = config as Record<string, unknown>;

  // Check for removed keys first (helpful error messages)
  for (const [key, message] of Object.entries(REMOVED_KEYS)) {
    if (key in obj) {
      throw new ConfigValidationError(message);
    }
  }

  checkUnknownKeys(obj, VALID_TOP_LEVEL_KEYS, '');

  // models
  if (obj.models !== undefined) {
    if (typeof obj.models !== 'object' || obj.models === null || Array.isArray(obj.models)) {
      throw new ConfigValidationError('models must be an object');
    }
    const models = obj.models as Record<string, unknown>;
    checkUnknownKeys(models, VALID_MODEL_KEYS, 'models');
    for (const [key, val] of Object.entries(models)) {
      validateModelEntry(val, `models.${key}`);
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
      validateModelEntry(val, `effortMapping.${key}`);
    }
  }

  // codex
  if (obj.codex !== undefined) {
    if (typeof obj.codex !== 'object' || obj.codex === null || Array.isArray(obj.codex)) {
      throw new ConfigValidationError('codex must be an object');
    }
    const codex = obj.codex as Record<string, unknown>;
    checkUnknownKeys(codex, VALID_CODEX_KEYS, 'codex');

    if (codex.executionMode !== undefined) {
      if (typeof codex.executionMode !== 'string' || !VALID_CODEX_EXECUTION_MODES.has(codex.executionMode)) {
        throw new ConfigValidationError('codex.executionMode must be one of: dangerous, fullAuto');
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

    if (display.statusProjectLimit !== undefined && !isNonNegativeInteger(display.statusProjectLimit)) {
      throw new ConfigValidationError('display.statusProjectLimit must be a non-negative integer');
    }
  }

  // context
  if (obj.context !== undefined) {
    if (typeof obj.context !== 'object' || obj.context === null || Array.isArray(obj.context)) {
      throw new ConfigValidationError('context must be an object');
    }
    const context = obj.context as Record<string, unknown>;
    checkUnknownKeys(context, VALID_CONTEXT_KEYS, 'context');

    for (const key of Object.keys(context)) {
      if (!isNonNegativeInteger(context[key])) {
        throw new ConfigValidationError(`context.${key} must be a non-negative integer`);
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

  // pushOnComplete
  if (obj.pushOnComplete !== undefined) {
    if (typeof obj.pushOnComplete !== 'boolean') {
      throw new ConfigValidationError('pushOnComplete must be a boolean');
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

  return config as UserConfig;
}

// ---- Deep merge ----

/** Deep-merge a single model entry: user override replaces the default entirely. */
function mergeModelEntry(defaultEntry: ModelEntry, override: unknown): ModelEntry {
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    const o = override as Record<string, unknown>;
    return {
      model: typeof o.model === 'string' ? o.model : defaultEntry.model,
      harness: typeof o.harness === 'string' ? (o.harness as HarnessName) : defaultEntry.harness,
      ...(o.reasoningEffort !== undefined
        ? { reasoningEffort: o.reasoningEffort as ModelEntry['reasoningEffort'] }
        : defaultEntry.reasoningEffort !== undefined
          ? { reasoningEffort: defaultEntry.reasoningEffort }
          : {}),
      ...(o.fast !== undefined
        ? { fast: o.fast as ModelEntry['fast'] }
        : defaultEntry.fast !== undefined
          ? { fast: defaultEntry.fast }
          : {}),
    };
  }
  return defaultEntry;
}

function deepMerge(defaults: RafConfig, overrides: UserConfig): RafConfig {
  const result = { ...defaults };

  if (overrides.models) {
    const m = overrides.models as Record<string, unknown>;
    result.models = {
      plan: m.plan ? mergeModelEntry(defaults.models.plan, m.plan) : { ...defaults.models.plan },
      execute: m.execute ? mergeModelEntry(defaults.models.execute, m.execute) : { ...defaults.models.execute },
      nameGeneration: m.nameGeneration ? mergeModelEntry(defaults.models.nameGeneration, m.nameGeneration) : { ...defaults.models.nameGeneration },
      failureAnalysis: m.failureAnalysis ? mergeModelEntry(defaults.models.failureAnalysis, m.failureAnalysis) : { ...defaults.models.failureAnalysis },
      prGeneration: m.prGeneration ? mergeModelEntry(defaults.models.prGeneration, m.prGeneration) : { ...defaults.models.prGeneration },
      config: m.config ? mergeModelEntry(defaults.models.config, m.config) : { ...defaults.models.config },
      merge: m.merge ? mergeModelEntry(defaults.models.merge, m.merge) : { ...defaults.models.merge },
    };
  }
  if (overrides.effortMapping) {
    const e = overrides.effortMapping as Record<string, unknown>;
    result.effortMapping = {
      low: e.low ? mergeModelEntry(defaults.effortMapping.low, e.low) : { ...defaults.effortMapping.low },
      medium: e.medium ? mergeModelEntry(defaults.effortMapping.medium, e.medium) : { ...defaults.effortMapping.medium },
      high: e.high ? mergeModelEntry(defaults.effortMapping.high, e.high) : { ...defaults.effortMapping.high },
    };
  }
  if (overrides.codex) {
    result.codex = {
      ...defaults.codex,
      ...overrides.codex,
    };
  }
  if (overrides.display) {
    result.display = {
      ...defaults.display,
      ...overrides.display,
    };
  }
  if (overrides.context) {
    result.context = {
      ...defaults.context,
      ...overrides.context,
    };
  }
  if (overrides.commitFormat) {
    result.commitFormat = { ...defaults.commitFormat, ...overrides.commitFormat };
  }
  if (overrides.timeout !== undefined) result.timeout = overrides.timeout;
  if (overrides.maxRetries !== undefined) result.maxRetries = overrides.maxRetries;
  if (overrides.autoCommit !== undefined) result.autoCommit = overrides.autoCommit;
  if (overrides.worktree !== undefined) result.worktree = overrides.worktree;
  if (overrides.syncMainBranch !== undefined) result.syncMainBranch = overrides.syncMainBranch;
  if (overrides.pushOnComplete !== undefined) result.pushOnComplete = overrides.pushOnComplete;

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
      models: {
        plan: { ...DEFAULT_CONFIG.models.plan },
        execute: { ...DEFAULT_CONFIG.models.execute },
        nameGeneration: { ...DEFAULT_CONFIG.models.nameGeneration },
        failureAnalysis: { ...DEFAULT_CONFIG.models.failureAnalysis },
        prGeneration: { ...DEFAULT_CONFIG.models.prGeneration },
        config: { ...DEFAULT_CONFIG.models.config },
        merge: { ...DEFAULT_CONFIG.models.merge },
      },
      effortMapping: {
        low: { ...DEFAULT_CONFIG.effortMapping.low },
        medium: { ...DEFAULT_CONFIG.effortMapping.medium },
        high: { ...DEFAULT_CONFIG.effortMapping.high },
      },
      codex: { ...DEFAULT_CONFIG.codex },
      display: { ...DEFAULT_CONFIG.display },
      context: { ...DEFAULT_CONFIG.context },
      commitFormat: { ...DEFAULT_CONFIG.commitFormat },
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

/**
 * Get the model entry for a scenario.
 */
export function getModel(scenario: ModelScenario): ModelEntry {
  const config = getResolvedConfig();
  return config.models[scenario];
}

/**
 * Get the full effort mapping config.
 */
export function getEffortMapping(): EffortMappingConfig {
  const config = getResolvedConfig();
  return config.effortMapping;
}

/**
 * Resolve a task effort level to a model entry using the effort mapping config.
 */
export function resolveEffortToModel(effort: TaskEffortLevel): ModelEntry {
  const config = getResolvedConfig();
  return config.effortMapping[effort];
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

/** Codex model tier ordering: codex (1) < gpt54 (2) */
const CODEX_MODEL_TIER_ORDER: Record<string, number> = {
  codex: 1,
  'gpt-5.3-codex': 1,
  gpt54: 2,
  'gpt-5.4': 2,
};

/**
 * Get the numeric tier of a model for comparison.
 * Extracts family from full model IDs (e.g., 'claude-opus-4-6' -> 3).
 * Unknown models default to highest tier (3) so they're never accidentally capped.
 */
export function getModelTier(modelName: string): number {
  // Check Claude short aliases first
  const tier = MODEL_TIER_ORDER[modelName];
  if (tier !== undefined) {
    return tier;
  }

  // Check Codex model tiers
  const codexTier = CODEX_MODEL_TIER_ORDER[modelName];
  if (codexTier !== undefined) {
    return codexTier;
  }

  // Extract family from full Claude model ID
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
 * Apply ceiling to a model entry based on the configured models.execute ceiling.
 * Returns the lower-tier entry between the input and the ceiling.
 * When the input exceeds the ceiling, the ceiling entry is returned (including its harness).
 */
export function applyModelCeiling(resolved: ModelEntry, ceiling?: ModelEntry): ModelEntry {
  const ceilingEntry = ceiling ?? getModel('execute');
  const resolvedTier = getModelTier(resolved.model);
  const ceilingTier = getModelTier(ceilingEntry.model);

  // If resolved model is above ceiling, use ceiling instead
  if (resolvedTier > ceilingTier) {
    return ceilingEntry;
  }
  return resolved;
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

export function getCodexExecutionMode(): CodexExecutionMode {
  return getResolvedConfig().codex.executionMode;
}

export function getSyncMainBranch(): boolean {
  return getResolvedConfig().syncMainBranch;
}

export function getPushOnComplete(): boolean {
  return getResolvedConfig().pushOnComplete;
}

export function getStatusProjectLimit(): number {
  return getResolvedConfig().display.statusProjectLimit;
}

/**
 * Extract the short model alias (opus, sonnet, haiku) from a model ID.
 * Works with both full model IDs (e.g., "claude-sonnet-4-5-20250929") and already-short names ("sonnet").
 * Returns the original string if no known alias can be extracted.
 */
export function getModelShortName(modelId: string): string {
  // Already a short Claude alias
  if (modelId === 'opus' || modelId === 'sonnet' || modelId === 'haiku') {
    return modelId;
  }
  // Codex short aliases
  if (modelId === 'codex' || modelId === 'gpt54') {
    return modelId;
  }
  // Codex model IDs -> short names
  if (modelId === 'gpt-5.3-codex') return 'codex';
  if (modelId === 'gpt-5.4') return 'gpt54';
  // Extract family from full Claude model ID: claude-{family}-{version}
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
 * Get the centralized user-facing display label for a model.
 * Preserve the configured/provider identifier instead of inventing pinned versions.
 * Harness-prefixed specs are unwrapped because the harness is usually displayed separately.
 */
export function getModelDisplayName(modelId: string): string {
  const prefixMatch = modelId.match(/^(claude|codex)\/(.+)$/);
  if (prefixMatch) {
    return prefixMatch[2]!;
  }

  return modelId;
}

interface ModelDisplayOptions {
  includeHarness?: boolean;
}

/**
 * Format a model label for user-facing logs.
 */
export function formatModelDisplay(
  model: string,
  harness?: HarnessName,
  options: ModelDisplayOptions = {},
): string {
  const label = getModelDisplayName(model);
  return options.includeHarness && harness ? `${label} (${harness})` : label;
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
