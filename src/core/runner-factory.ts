import type { HarnessName } from '../types/config.js';
import type { ICliRunner } from './runner-interface.js';
import type { RunnerConfig } from './runner-types.js';
import { ClaudeRunner } from './claude-runner.js';
import { CodexRunner } from './codex-runner.js';

/**
 * Create a CLI runner for the given harness configuration.
 */
export function createRunner(config: RunnerConfig = {}): ICliRunner {
  const harness = config.harness ?? 'claude';

  switch (harness) {
    case 'claude':
      return new ClaudeRunner(config);
    case 'codex':
      return new CodexRunner(config);
    default:
      throw new Error(`Unknown harness: ${harness}`);
  }
}

/**
 * Get the binary name for a given harness.
 */
export function getHarnessBinaryName(harness: HarnessName): string {
  switch (harness) {
    case 'claude':
      return 'claude';
    case 'codex':
      return 'codex';
    default:
      throw new Error(`Unknown harness: ${harness}`);
  }
}
