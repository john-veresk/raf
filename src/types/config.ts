/** CLI harness name */
export type HarnessName = 'claude' | 'codex';

/** Short alias for a Claude model family */
export type ClaudeModelAlias = 'sonnet' | 'haiku' | 'opus';

/** Short alias for a Codex model family */
export type CodexModelAlias = 'codex' | 'gpt54';

/** Harness-agnostic model alias (union of all harness aliases) */
export type ModelAlias = ClaudeModelAlias | CodexModelAlias;

/**
 * Accepts short aliases (`sonnet`, `haiku`, `opus`) or full model IDs
 * matching the pattern `claude-{family}-{version}` (e.g., `claude-opus-4-5-20251101`).
 * Also accepts harness-prefixed format: `claude/opus`, `codex/gpt-5.4`.
 */
export type ClaudeModelName = ClaudeModelAlias | (string & { __brand?: 'FullModelId' });

/** Harness-agnostic model name — accepts any alias, full ID, or harness-prefixed format */
export type ModelName = string & { __brand?: 'ModelName' };

/** Task complexity label for per-task effort frontmatter. Maps to models via effortMapping. */
export type TaskEffortLevel = 'low' | 'medium' | 'high';

/** Codex execution policy for non-interactive `codex exec` runs. */
export type CodexExecutionMode = 'dangerous' | 'fullAuto';

export interface CodexConfig {
  /** Execution mode for Codex non-interactive runs. */
  executionMode: CodexExecutionMode;
}

export type ModelScenario = 'plan' | 'execute' | 'nameGeneration' | 'failureAnalysis' | 'prGeneration' | 'config';
export type CommitFormatType = 'task' | 'plan' | 'amend';

/**
 * A harness-aware model configuration entry.
 * Stores model, harness, and optional reasoning effort together.
 */
export interface ModelEntry {
  /** Model name: short alias (opus, sonnet, gpt-5.4) or full ID */
  model: string;
  /** Which CLI harness to use for this entry */
  harness: HarnessName;
  /** Optional reasoning effort hint. Codex accepts: "none", "minimal", "low", "medium", "high", "xhigh" */
  reasoningEffort?: string;
  /** Enable fast mode for faster output (Claude only). Default: false/omitted. */
  fast?: boolean;
}

export interface ModelsConfig {
  plan: ModelEntry;
  execute: ModelEntry;
  nameGeneration: ModelEntry;
  failureAnalysis: ModelEntry;
  prGeneration: ModelEntry;
  config: ModelEntry;
}

/**
 * Maps task complexity labels to harness-aware model entries.
 * Used to resolve per-task effort frontmatter to a model.
 */
export interface EffortMappingConfig {
  low: ModelEntry;
  medium: ModelEntry;
  high: ModelEntry;
}

export interface CommitFormatConfig {
  task: string;
  plan: string;
  amend: string;
  prefix: string;
}

export interface RafConfig {
  models: ModelsConfig;
  /** Maps task complexity labels (low/medium/high) to model entries. Used for per-task effort frontmatter. */
  effortMapping: EffortMappingConfig;
  /** Codex execution behavior for non-interactive task runs. */
  codex: CodexConfig;
  timeout: number;
  maxRetries: number;
  autoCommit: boolean;
  worktree: boolean;
  /** Sync main branch with remote before worktree/PR operations. Default: true */
  syncMainBranch: boolean;
  commitFormat: CommitFormatConfig;
}

/**
 * Full schema with all valid keys including optional ones.
 * Used for key validation in `raf config set` — DEFAULT_CONFIG omits optional
 * fields, so we need this to know that e.g. `models.execute.reasoningEffort`
 * is a valid path even though it has no default value.
 */
const MODEL_ENTRY_SCHEMA: Required<ModelEntry> = {
  model: '',
  harness: 'claude',
  reasoningEffort: '',
  fast: false,
};

function buildConfigSchema(config: RafConfig): RafConfig {
  const fillModelEntry = (entry: ModelEntry): Required<ModelEntry> => ({
    ...MODEL_ENTRY_SCHEMA,
    ...entry,
  });
  return {
    ...config,
    models: {
      plan: fillModelEntry(config.models.plan),
      execute: fillModelEntry(config.models.execute),
      nameGeneration: fillModelEntry(config.models.nameGeneration),
      failureAnalysis: fillModelEntry(config.models.failureAnalysis),
      prGeneration: fillModelEntry(config.models.prGeneration),
      config: fillModelEntry(config.models.config),
    },
    effortMapping: {
      low: fillModelEntry(config.effortMapping.low),
      medium: fillModelEntry(config.effortMapping.medium),
      high: fillModelEntry(config.effortMapping.high),
    },
  };
}

export const DEFAULT_CONFIG: RafConfig = {
  models: {
    plan: { model: 'opus', harness: 'claude' },
    execute: { model: 'opus', harness: 'claude' },
    nameGeneration: { model: 'sonnet', harness: 'claude' },
    failureAnalysis: { model: 'haiku', harness: 'claude' },
    prGeneration: { model: 'sonnet', harness: 'claude' },
    config: { model: 'sonnet', harness: 'claude' },
  },
  effortMapping: {
    low: { model: 'sonnet', harness: 'claude' },
    medium: { model: 'opus', harness: 'claude' },
    high: { model: 'opus', harness: 'claude' },
  },
  codex: {
    executionMode: 'dangerous',
  },
  timeout: 60,
  maxRetries: 3,
  autoCommit: true,
  worktree: false,
  syncMainBranch: true,
  commitFormat: {
    task: '{prefix}[{projectName}:{taskId}] {description}',
    plan: '{prefix}[{projectName}] Plan: {description}',
    amend: '{prefix}[{projectName}] Amend: {description}',
    prefix: 'RAF',
  },
};

/**
 * Schema with all valid keys (including optional ModelEntry fields).
 * Used only for key validation in `raf config set`.
 */
export const CONFIG_SCHEMA: RafConfig = buildConfigSchema(DEFAULT_CONFIG);

/** Deep partial type for user config files — all fields optional at every level */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserConfig = DeepPartial<RafConfig>;

export const VALID_MODEL_ALIASES: readonly ClaudeModelAlias[] = ['sonnet', 'haiku', 'opus'];

export const VALID_CODEX_MODEL_ALIASES: readonly CodexModelAlias[] = ['codex', 'gpt54'];

export const VALID_HARNESSES: readonly HarnessName[] = ['claude', 'codex'];

/**
 * Regex for full Claude model IDs (e.g., `claude-sonnet-4-5-20250929`, `claude-opus-4-5-20251101`).
 * Pattern: claude-{family}-{major}(-{minor})?(-{date})?
 */
export const FULL_MODEL_ID_PATTERN = /^claude-[a-z]+-\d+(-\d+)*$/;

/** @deprecated Use VALID_MODEL_ALIASES instead */
export const VALID_MODELS = VALID_MODEL_ALIASES;

/** Valid task effort levels for plan frontmatter. */
export const VALID_TASK_EFFORTS: readonly TaskEffortLevel[] = ['low', 'medium', 'high'];

// Keep backward-compat exports used by other modules
/** @deprecated Use DEFAULT_CONFIG instead */
export const DEFAULT_RAF_CONFIG = {
  defaultTimeout: DEFAULT_CONFIG.timeout,
  defaultMaxRetries: DEFAULT_CONFIG.maxRetries,
  autoCommit: DEFAULT_CONFIG.autoCommit,
};

export interface PlanCommandOptions {
  projectName?: string;
}

export interface DoCommandOptions {
  timeout?: number;
  verbose?: boolean;
  debug?: boolean;
  force?: boolean;
}

export interface StatusCommandOptions {
  json?: boolean;
}

/** Per-model token usage breakdown from stream-json result event. */
export interface ModelTokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Cost in USD for this model's usage (provided by Claude CLI). */
  costUsd?: number | null;
}

/** Token usage data extracted from Claude CLI stream-json result event. */
export interface UsageData {
  /** Aggregate token counts across all models. */
  inputTokens: number;
  outputTokens: number;
  /** Per-model breakdown (e.g., { "claude-opus-4-6": { ... } }). */
  modelUsage: Record<string, ModelTokenUsage>;
  /** Total cost in USD for this usage (provided by Claude CLI). */
  totalCostUsd: number | null;
}
