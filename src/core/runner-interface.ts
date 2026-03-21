import type { RunnerOptions, RunResult } from './runner-types.js';

/**
 * Provider-agnostic CLI runner interface.
 * Both ClaudeRunner and CodexRunner implement this interface.
 */
export interface ICliRunner {
  runInteractive(systemPrompt: string, userMessage: string, options?: RunnerOptions): Promise<number>;
  runResume(options?: RunnerOptions): Promise<number>;
  run(prompt: string, options?: RunnerOptions): Promise<RunResult>;
  runVerbose(prompt: string, options?: RunnerOptions): Promise<RunResult>;
  kill(): void;
  isRunning(): boolean;
}
