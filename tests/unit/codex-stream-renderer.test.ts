import { renderCodexStreamEvent } from '../../src/parsers/codex-stream-renderer.js';

describe('renderCodexStreamEvent', () => {
  describe('item.completed with item.type: error (NEW-1)', () => {
    it('renders an error line from item.completed error event', () => {
      const line = JSON.stringify({
        type: 'item.completed',
        item: { type: 'error', message: 'model not found: gpt-bad' },
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Error: model not found: gpt-bad');
      expect(result.textContent).toBe('model not found: gpt-bad');
    });

    it('uses fallback text when item.message is absent', () => {
      const line = JSON.stringify({
        type: 'item.completed',
        item: { type: 'error' },
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Error: Unknown error');
    });
  });

  describe('turn.failed with nested error.message (NEW-2)', () => {
    it('surfaces nested error.message instead of generic fallback', () => {
      const line = JSON.stringify({
        type: 'turn.failed',
        error: { message: 'rate limit exceeded' },
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Failed: rate limit exceeded');
      expect(result.textContent).toBe('rate limit exceeded');
    });

    it('falls back to event.message when error object is absent', () => {
      const line = JSON.stringify({
        type: 'turn.failed',
        message: 'context length exceeded',
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Failed: context length exceeded');
    });

    it('falls back to generic text when neither error.message nor message is present', () => {
      const line = JSON.stringify({ type: 'turn.failed' });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Failed: Turn failed');
    });
  });

  describe('existing event types remain unchanged', () => {
    it('renders item.completed agent_message', () => {
      const line = JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Done.' },
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toBe('Done.\n');
      expect(result.textContent).toBe('Done.');
    });

    it('renders item.completed command_execution', () => {
      const line = JSON.stringify({
        type: 'item.completed',
        item: { type: 'command_execution', command: 'npm test', exit_code: 0 },
      });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('Running: npm test');
      expect(result.display).toContain('[✓]');
    });

    it('renders top-level error event', () => {
      const line = JSON.stringify({ type: 'error', message: 'fatal error' });
      const result = renderCodexStreamEvent(line);
      expect(result.display).toContain('✗ Error: fatal error');
    });
  });
});
