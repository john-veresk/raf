import type { HarnessProvider } from '../types/config.js';
import type { ICliRunner } from './runner-interface.js';
import type { RunnerConfig } from './runner-types.js';
import { ClaudeRunner } from './claude-runner.js';

/**
 * Create a CLI runner for the given provider configuration.
 */
export function createRunner(config: RunnerConfig = {}): ICliRunner {
  const provider = config.provider ?? 'claude';

  switch (provider) {
    case 'claude':
      return new ClaudeRunner(config);
    case 'codex':
      throw new Error('Codex runner not yet implemented');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Get the binary name for a given provider.
 */
export function getProviderBinaryName(provider: HarnessProvider): string {
  switch (provider) {
    case 'claude':
      return 'claude';
    case 'codex':
      return 'codex';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
