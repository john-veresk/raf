/**
 * Renders stream-json events from Claude CLI into human-readable verbose output.
 *
 * Event types from `claude -p --output-format stream-json --verbose`:
 * - system (init): Session initialization info
 * - assistant: LLM response with text or tool_use content blocks
 * - user: Tool results (tool_result content blocks)
 * - result: Final result with success/failure status and token usage
 */

import type { UsageData, ModelTokenUsage } from '../types/config.js';
import type { RateLimitInfo } from '../core/runner-types.js';
import { logger } from '../utils/logger.js';

export interface StreamEvent {
  type: string;
  subtype?: string;
  status?: string;
  resetsAt?: number;
  rateLimitType?: string;
  is_error?: boolean;
  error?: string;
  retry_attempt?: number;
  message?: {
    content?: ContentBlock[];
  };
  result?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  total_cost_usd?: number;
  modelUsage?: Record<string, {
    inputTokens?: number;
    outputTokens?: number;
    costUSD?: number;
  }>;
  tool_use_result?: {
    type?: string;
    file?: {
      filePath?: string;
    };
  };
}

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/**
 * Describes what a tool is doing in human-readable form.
 */
function describeToolUse(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'Read':
      return `Reading ${input.file_path ?? 'file'}`;
    case 'Write':
      return `Writing ${input.file_path ?? 'file'}`;
    case 'Edit':
      return `Editing ${input.file_path ?? 'file'}`;
    case 'Bash':
      return `Running: ${truncate(String(input.command ?? ''), 120)}`;
    case 'Glob':
      return `Searching files: ${input.pattern ?? ''}`;
    case 'Grep':
      return `Searching for: ${truncate(String(input.pattern ?? ''), 80)}`;
    case 'WebFetch':
      return `Fetching: ${input.url ?? ''}`;
    case 'WebSearch':
      return `Searching web: ${input.query ?? ''}`;
    case 'TodoWrite':
      return 'Updating task list';
    case 'Task':
      return `Launching agent: ${truncate(String(input.description ?? input.prompt ?? ''), 80)}`;
    case 'NotebookEdit':
      return `Editing notebook: ${input.notebook_path ?? ''}`;
    default:
      return `Using tool: ${name}`;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

export interface RenderResult {
  /** Text to display to stdout (may be empty if no display needed) */
  display: string;
  /** Text content to accumulate for output parsing (completion markers, etc.) */
  textContent: string;
  /** Usage data extracted from result events (only present on result events) */
  usageData?: UsageData;
  /** Rate limit info extracted from rate_limit_event events */
  rateLimitInfo?: RateLimitInfo;
}

/**
 * Parse and render a single NDJSON line from stream-json output.
 * Returns display text for stdout and text content for output accumulation.
 */
export function renderStreamEvent(line: string): RenderResult {
  if (!line.trim()) {
    return { display: '', textContent: '' };
  }

  let event: StreamEvent;
  try {
    event = JSON.parse(line) as StreamEvent;
  } catch {
    // Not valid JSON - pass through raw
    return { display: line + '\n', textContent: line };
  }

  switch (event.type) {
    case 'system':
      return renderSystem(event);

    case 'assistant':
      return renderAssistant(event);

    case 'user':
      // Tool results — skip verbose display (the tool_use already described what's happening)
      return { display: '', textContent: '' };

    case 'result':
      return renderResult(event);

    case 'rate_limit_event':
      return renderRateLimitEvent(event);

    default:
      return { display: '', textContent: '' };
  }
}

function renderSystem(event: StreamEvent): RenderResult {
  // Log transient rate limit retries (handled internally by Claude Code)
  if (event.subtype === 'api_retry' && event.error === 'rate_limit') {
    logger.debug(`Claude Code transient rate limit retry (attempt ${event.retry_attempt ?? '?'})`);
  }
  return { display: '', textContent: '' };
}

function renderRateLimitEvent(event: StreamEvent): RenderResult {
  if (event.status === 'rejected' && event.resetsAt) {
    const resetsAt = new Date(event.resetsAt * 1000);
    const limitType = event.rateLimitType ?? 'unknown';
    logger.debug(`Rate limit event: type=${limitType}, resetsAt=${resetsAt.toISOString()}`);
    return {
      display: '',
      textContent: '',
      rateLimitInfo: { resetsAt, limitType },
    };
  }
  return { display: '', textContent: '' };
}

function renderAssistant(event: StreamEvent): RenderResult {
  const content = event.message?.content;
  if (!content || !Array.isArray(content)) {
    return { display: '', textContent: '' };
  }

  let display = '';
  let textContent = '';

  for (const block of content) {
    if (block.type === 'text' && block.text) {
      textContent += block.text;
      display += block.text + '\n';
    } else if (block.type === 'tool_use' && block.name) {
      const description = describeToolUse(block.name, block.input ?? {});
      display += `  → ${description}\n`;
    }
  }

  return { display, textContent };
}

function renderResult(event: StreamEvent): RenderResult {
  // The result event's text duplicates the last assistant message,
  // which is already captured. Skip text to avoid double-counting.
  // But extract usage data if present.
  const usageData = extractUsageData(event);
  return { display: '', textContent: '', usageData };
}

/**
 * Extract usage data from a stream-json result event.
 * Returns undefined if no usage data is present.
 */
function extractUsageData(event: StreamEvent): UsageData | undefined {
  if (!event.usage && !event.modelUsage) {
    return undefined;
  }

  const usage = event.usage;
  const modelUsage: Record<string, ModelTokenUsage> = {};

  if (event.modelUsage) {
    for (const [model, data] of Object.entries(event.modelUsage)) {
      modelUsage[model] = {
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        costUsd: data.costUSD ?? 0,
      };
    }
  }

  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    modelUsage,
    totalCostUsd: event.total_cost_usd ?? 0,
  };
}
