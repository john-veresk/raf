export interface RafConfig {
  defaultTimeout: number;
  defaultMaxRetries: number;
  autoCommit: boolean;
  claudeCommand: string;
  editor?: string;
}

export const DEFAULT_RAF_CONFIG: RafConfig = {
  defaultTimeout: 60,
  defaultMaxRetries: 3,
  autoCommit: true,
  claudeCommand: 'claude',
};

export type ClaudeModelName = 'sonnet' | 'haiku' | 'opus';

export interface PlanCommandOptions {
  projectName?: string;
  model?: ClaudeModelName;
  sonnet?: boolean;
}

export interface DoCommandOptions {
  timeout?: number;
  verbose?: boolean;
  debug?: boolean;
  force?: boolean;
  model?: ClaudeModelName;
  sonnet?: boolean;
}

export interface StatusCommandOptions {
  json?: boolean;
}
