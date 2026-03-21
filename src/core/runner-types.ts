import type { UsageData, HarnessProvider } from '../types/config.js';

/**
 * Options for a single runner execution (run, runVerbose, runInteractive, etc.).
 */
export interface RunnerOptions {
  /**
   * Timeout in minutes for this single execution.
   * Default: 60 minutes.
   * Each call to run() or runVerbose() gets its own fresh timeout.
   * Retries get a fresh timeout - elapsed time is NOT accumulated across attempts.
   */
  timeout?: number;
  cwd?: string;
  /**
   * Skip permission prompts for file operations.
   * Only used in interactive mode (runInteractive).
   */
  dangerouslySkipPermissions?: boolean;
  /**
   * Path to the outcome file. When provided, enables completion detection:
   * - Monitors stdout for completion markers (<promise>COMPLETE/FAILED</promise>)
   * - Polls the outcome file for completion markers
   * When detected, starts a grace period before terminating the process,
   * allowing time for git commit operations to complete.
   */
  outcomeFilePath?: string;
  /**
   * Commit verification context. When provided, the grace period will verify
   * that the expected git commit has been made before terminating.
   * Only applies when a COMPLETE marker is detected (not FAILED).
   */
  commitContext?: {
    /** HEAD commit hash recorded before task execution began. */
    preExecutionHead: string;
    /** Expected commit message prefix (e.g., "RAF[005:01]"). */
    expectedPrefix: string;
    /** Path to the outcome file that should be committed. */
    outcomeFilePath: string;
  };
  /**
   * Dynamic verbose display callback. When provided, called for each stream event
   * to determine whether to write display output to stdout. Overrides the static
   * verbose parameter in _runStreamJson. Used by the runtime verbose toggle.
   */
  verboseCheck?: () => boolean;
}

/**
 * Configuration for creating a runner instance.
 */
export interface RunnerConfig {
  /**
   * Model to use (e.g., opus, sonnet, haiku, gpt-5.4).
   * Default: provider-specific default.
   */
  model?: string;
  /**
   * CLI provider to use.
   * Default: 'claude'.
   */
  provider?: HarnessProvider;
  /**
   * Reasoning effort level to pass to the CLI.
   * Claude CLI: --effort <level>
   * Codex CLI: -c model_reasoning_effort="<level>"
   * Only included when explicitly set.
   */
  reasoningEffort?: string;
}

/**
 * Result of a non-interactive runner execution.
 */
export interface RunResult {
  output: string;
  exitCode: number;
  timedOut: boolean;
  contextOverflow: boolean;
  /** Token usage data from the stream-json result event. */
  usageData?: UsageData;
}
