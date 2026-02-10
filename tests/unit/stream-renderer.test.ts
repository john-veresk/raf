import { renderStreamEvent } from '../../src/parsers/stream-renderer.js';

describe('renderStreamEvent', () => {
  describe('system events', () => {
    it('should not display system init events', () => {
      const line = JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 'test-session',
        tools: ['Read', 'Write', 'Bash'],
        model: 'claude-opus-4-6',
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });
  });

  describe('assistant events with text', () => {
    it('should display and capture text content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'The version is 1.3.1' }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('The version is 1.3.1\n');
      expect(result.textContent).toBe('The version is 1.3.1');
    });

    it('should handle multiple text blocks in one message', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part' },
          ],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.textContent).toBe('First partSecond part');
    });

    it('should capture text containing completion markers', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Task done.\n<promise>COMPLETE</promise>' }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.textContent).toContain('<promise>COMPLETE</promise>');
    });
  });

  describe('assistant events with tool_use', () => {
    it('should display Read tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/src/main.ts' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Reading /src/main.ts');
      expect(result.textContent).toBe('');
    });

    it('should display Write tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/src/new.ts' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Writing /src/new.ts');
    });

    it('should display Edit tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Edit', input: { file_path: '/src/fix.ts' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Editing /src/fix.ts');
    });

    it('should display Bash tool with command', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Running: npm test');
    });

    it('should truncate long Bash commands', () => {
      const longCommand = 'a'.repeat(200);
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Bash', input: { command: longCommand } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display.length).toBeLessThan(200);
      expect(result.display).toContain('...');
    });

    it('should display Glob tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Glob', input: { pattern: '**/*.ts' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Searching files: **/*.ts');
    });

    it('should display Grep tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Grep', input: { pattern: 'TODO' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Searching for: TODO');
    });

    it('should display WebFetch tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'WebFetch', input: { url: 'https://example.com' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Fetching: https://example.com');
    });

    it('should display WebSearch tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'WebSearch', input: { query: 'node.js streams' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Searching web: node.js streams');
    });

    it('should display TodoWrite tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'TodoWrite', input: { todos: [] } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Updating task list');
    });

    it('should display Task (agent) tool usage', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Task', input: { description: 'Search codebase' } }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Launching agent: Search codebase');
    });

    it('should display unknown tools generically', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'CustomTool', input: {} }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Using tool: CustomTool');
    });
  });

  describe('mixed content blocks', () => {
    it('should handle text and tool_use in same message', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read the file.' },
            { type: 'tool_use', name: 'Read', input: { file_path: '/src/main.ts' } },
          ],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toContain('Let me read the file.');
      expect(result.display).toContain('Reading /src/main.ts');
      expect(result.textContent).toBe('Let me read the file.');
    });
  });

  describe('user events (tool results)', () => {
    it('should not display tool result events', () => {
      const line = JSON.stringify({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'test-id', content: 'file contents here' }],
        },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });
  });

  describe('result events', () => {
    it('should not duplicate result text (already captured from assistant events)', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'The version is 1.3.1',
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });

    it('should extract usage data from result event', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'Done',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_read_input_tokens: 200,
          cache_creation_input_tokens: 100,
        },
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1000,
            outputTokens: 500,
            cacheReadInputTokens: 200,
            cacheCreationInputTokens: 100,
          },
        },
      });
      const result = renderStreamEvent(line);
      expect(result.usageData).toBeDefined();
      expect(result.usageData!.inputTokens).toBe(1000);
      expect(result.usageData!.outputTokens).toBe(500);
      expect(result.usageData!.cacheReadInputTokens).toBe(200);
      expect(result.usageData!.cacheCreationInputTokens).toBe(100);
      expect(result.usageData!.modelUsage['claude-opus-4-6']).toEqual({
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadInputTokens: 200,
        cacheCreationInputTokens: 100,
      });
    });

    it('should return undefined usageData when no usage in result', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'Done',
      });
      const result = renderStreamEvent(line);
      expect(result.usageData).toBeUndefined();
    });

    it('should handle partial usage data gracefully', () => {
      const line = JSON.stringify({
        type: 'result',
        usage: { input_tokens: 500 },
      });
      const result = renderStreamEvent(line);
      expect(result.usageData).toBeDefined();
      expect(result.usageData!.inputTokens).toBe(500);
      expect(result.usageData!.outputTokens).toBe(0);
      expect(result.usageData!.cacheReadInputTokens).toBe(0);
      expect(result.usageData!.cacheCreationInputTokens).toBe(0);
      expect(result.usageData!.modelUsage).toEqual({});
    });

    it('should handle multi-model usage data', () => {
      const line = JSON.stringify({
        type: 'result',
        usage: {
          input_tokens: 2000,
          output_tokens: 800,
        },
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1500,
            outputTokens: 600,
          },
          'claude-haiku-4-5-20251001': {
            inputTokens: 500,
            outputTokens: 200,
          },
        },
      });
      const result = renderStreamEvent(line);
      expect(result.usageData).toBeDefined();
      expect(Object.keys(result.usageData!.modelUsage)).toHaveLength(2);
      expect(result.usageData!.modelUsage['claude-opus-4-6'].inputTokens).toBe(1500);
      expect(result.usageData!.modelUsage['claude-haiku-4-5-20251001'].inputTokens).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('should handle empty lines', () => {
      const result = renderStreamEvent('');
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });

    it('should handle whitespace-only lines', () => {
      const result = renderStreamEvent('   ');
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });

    it('should handle invalid JSON gracefully', () => {
      const result = renderStreamEvent('not json at all');
      expect(result.display).toBe('not json at all\n');
      expect(result.textContent).toBe('not json at all');
    });

    it('should handle assistant event with no content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {},
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });

    it('should handle assistant event with empty content array', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [] },
      });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });

    it('should handle unknown event types', () => {
      const line = JSON.stringify({ type: 'unknown_event' });
      const result = renderStreamEvent(line);
      expect(result.display).toBe('');
      expect(result.textContent).toBe('');
    });
  });
});
