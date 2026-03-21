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
  /** AgentMessage fields */
  content?: string;
  /** CommandExecution fields */
  command?: string;
  exit_code?: number;
  /** FileChange fields */
  file_path?: string;
  change_kind?: string;
  /** McpToolCall fields */
  tool_name?: string;
  server_name?: string;
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
