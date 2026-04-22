import { formatResolvedTaskModel } from '../../src/commands/do.js';
import type { ModelEntry } from '../../src/types/config.js';

describe('do model display', () => {
  it('should include effort metadata in verbose model logs', () => {
    const entry: ModelEntry = {
      model: 'sonnet',
      harness: 'claude',
      reasoningEffort: 'low',
    };

    expect(formatResolvedTaskModel(entry)).toBe('sonnet, low');
  });

  it('should omit effort when unavailable', () => {
    const entry: ModelEntry = {
      model: 'sonnet',
      harness: 'claude',
    };

    expect(formatResolvedTaskModel(entry)).toBe('sonnet');
  });

  it('should append fast metadata in verbose model logs when enabled', () => {
    const entry: ModelEntry = {
      model: 'gpt-5.4',
      harness: 'codex',
      reasoningEffort: 'medium',
      fast: true,
    };

    expect(formatResolvedTaskModel(entry)).toBe('gpt-5.4, medium, fast');
  });

  it('should keep codex aliases unpinned in verbose logs', () => {
    const entry: ModelEntry = {
      model: 'codex',
      harness: 'codex',
    };

    expect(formatResolvedTaskModel(entry)).toBe('codex');
  });

  it('should preserve explicit full model ids in verbose logs', () => {
    const entry: ModelEntry = {
      model: 'gpt-5.4-2026-03-05',
      harness: 'codex',
    };

    expect(formatResolvedTaskModel(entry)).toBe('gpt-5.4-2026-03-05');
  });
});
