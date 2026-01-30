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
