import { formatResolvedTaskModel } from '../../src/commands/do.js';
import type { ModelEntry } from '../../src/types/config.js';

describe('do model display', () => {
  it('should include effort and fast metadata in verbose model logs', () => {
    const entry: ModelEntry = {
      model: 'sonnet',
      harness: 'claude',
      reasoningEffort: 'low',
      fast: true,
    };

    expect(formatResolvedTaskModel(entry)).toBe('claude-sonnet-4-5-20250929, low, fast');
  });

  it('should omit effort when unavailable', () => {
    const entry: ModelEntry = {
      model: 'sonnet',
      harness: 'claude',
    };

    expect(formatResolvedTaskModel(entry)).toBe('claude-sonnet-4-5-20250929');
  });

  it('should omit fast when false', () => {
    const entry: ModelEntry = {
      model: 'sonnet',
      harness: 'claude',
      reasoningEffort: 'low',
      fast: false,
    };

    expect(formatResolvedTaskModel(entry)).toBe('claude-sonnet-4-5-20250929, low');
  });

  it('should render codex alias as canonical full id', () => {
    const entry: ModelEntry = {
      model: 'codex',
      harness: 'codex',
    };

    expect(formatResolvedTaskModel(entry)).toBe('gpt-5.3-codex');
  });
});
