/**
 * Renders JSONL events from Codex CLI into human-readable verbose output.
 *
 * Codex CLI (`codex exec --json`) emits one JSON object per line with event types:
 * - AgentMessage: Text content from the agent
 * - CommandExecution: Shell command execution (command + exit code)
 * - FileChange: File modification (path + change kind)
 * - McpToolCall: MCP tool invocation
 * - TodoList: Task tracking (skipped)
 */

import type { RenderResult } from './stream-renderer.js';

export interface CodexEvent {
  type: string;
  /** Claude flat-format fields (AgentMessage) */
  content?: string;
  /** Claude flat-format fields (CommandExecution) */
  command?: string;
  exit_code?: number;
  /** Claude flat-format fields (FileChange) */
  file_path?: string;
  change_kind?: string;
  /** Claude flat-format fields (McpToolCall) */
  tool_name?: string;
  server_name?: string;
  /** Real Codex nested item (for item.completed / item.started) */
  item?: {
    type: string;
    text?: string;
    command?: string;
    exit_code?: number;
    path?: string;
    change_kind?: string;
    message?: string;
  };
  /** Error message (for error / turn.failed events) */
  message?: string;
  /** Nested error object (for turn.failed events) */
  error?: { message?: string };
  /** Usage data (for turn.completed events) */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

/**
 * Parse and render a single JSONL line from Codex CLI output.
 * Returns the same RenderResult interface as Claude's stream renderer.
 */
export function renderCodexStreamEvent(line: string): RenderResult {
  if (!line.trim()) {
    return { display: '', textContent: '' };
  }

  let event: CodexEvent;
  try {
    event = JSON.parse(line) as CodexEvent;
  } catch {
    // Not valid JSON - pass through raw
    return { display: line + '\n', textContent: line };
  }

  switch (event.type) {
    case 'AgentMessage':
      return renderAgentMessage(event);

    case 'CommandExecution':
      return renderCommandExecution(event);

    case 'FileChange':
      return renderFileChange(event);

    case 'McpToolCall':
      return renderMcpToolCall(event);

    case 'TodoList':
      // Skip todo list events - minimal noise
      return { display: '', textContent: '' };

    // Real Codex CLI event types (nested format)
    case 'item.completed':
      return renderItemCompleted(event);

    case 'item.started':
      // Skip started events — we render on completion
      return { display: '', textContent: '' };

    case 'turn.completed':
      return renderTurnCompleted(event);

    case 'error':
      return renderError(event);

    case 'turn.failed':
      return renderTurnFailed(event);

    default:
      // Skip unknown event types gracefully
      return { display: '', textContent: '' };
  }
}

function renderAgentMessage(event: CodexEvent): RenderResult {
  const text = event.content ?? '';
  return {
    display: text ? text + '\n' : '',
    textContent: text,
  };
}

function renderCommandExecution(event: CodexEvent): RenderResult {
  const cmd = event.command ?? '';
  const exitCode = event.exit_code ?? 0;
  const status = exitCode === 0 ? '✓' : `✗ exit ${exitCode}`;
  return {
    display: `  → Running: ${truncate(cmd, 120)} [${status}]\n`,
    textContent: '',
  };
}

function renderFileChange(event: CodexEvent): RenderResult {
  const filePath = event.file_path ?? 'unknown';
  const kind = event.change_kind ?? 'modified';
  return {
    display: `  → File ${kind}: ${filePath}\n`,
    textContent: '',
  };
}

function renderMcpToolCall(event: CodexEvent): RenderResult {
  const tool = event.tool_name ?? 'unknown';
  const server = event.server_name ? ` (${event.server_name})` : '';
  return {
    display: `  → MCP tool: ${tool}${server}\n`,
    textContent: '',
  };
}

// --- Real Codex CLI event handlers (nested format) ---

function renderItemCompleted(event: CodexEvent): RenderResult {
  const item = event.item;
  if (!item) return { display: '', textContent: '' };

  switch (item.type) {
    case 'agent_message': {
      const text = item.text ?? '';
      return {
        display: text ? text + '\n' : '',
        textContent: text,
      };
    }
    case 'command_execution': {
      const cmd = item.command ?? '';
      const exitCode = item.exit_code ?? 0;
      const status = exitCode === 0 ? '✓' : `✗ exit ${exitCode}`;
      return {
        display: `  → Running: ${truncate(cmd, 120)} [${status}]\n`,
        textContent: '',
      };
    }
    case 'file_change': {
      const filePath = item.path ?? 'unknown';
      const kind = item.change_kind ?? 'modified';
      return {
        display: `  → File ${kind}: ${filePath}\n`,
        textContent: '',
      };
    }
    case 'error': {
      const msg = item.message ?? 'Unknown error';
      return {
        display: `  ✗ Error: ${msg}\n`,
        textContent: msg,
      };
    }
    default:
      return { display: '', textContent: '' };
  }
}

function renderTurnCompleted(event: CodexEvent): RenderResult {
  if (event.usage) {
    const { input_tokens, output_tokens } = event.usage;
    const parts: string[] = [];
    if (input_tokens) parts.push(`in: ${input_tokens}`);
    if (output_tokens) parts.push(`out: ${output_tokens}`);
    if (parts.length > 0) {
      return {
        display: `  → Usage: ${parts.join(', ')}\n`,
        textContent: '',
      };
    }
  }
  return { display: '', textContent: '' };
}

function renderError(event: CodexEvent): RenderResult {
  const msg = event.message ?? 'Unknown error';
  return {
    display: `  ✗ Error: ${msg}\n`,
    textContent: msg,
  };
}

function renderTurnFailed(event: CodexEvent): RenderResult {
  const msg = event.error?.message ?? event.message ?? 'Turn failed';
  return {
    display: `  ✗ Failed: ${msg}\n`,
    textContent: msg,
  };
}
