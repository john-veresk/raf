/**
 * Terminal symbols and formatting helpers for beautiful terminal output.
 * All functions are pure and testable - no side effects.
 */

import { formatElapsedTime } from './timer.js';
import type { UsageData } from '../types/config.js';
import type { CostBreakdown, TaskUsageEntry } from './token-tracker.js';

function hasExactCost(cost: number | null): cost is number {
  return cost !== null;
}

/**
 * Visual symbols for terminal output using dots/symbols style.
 */
export const SYMBOLS = {
  running: '●',
  completed: '✓',
  failed: '✗',
  pending: '○',
  blocked: '⊘',
  project: '▶',
} as const;

export type TaskStatus = 'running' | 'completed' | 'failed' | 'pending' | 'blocked';

export interface ModelDisplayOptions {
  effort?: string;
}

/**
 * Truncates a string to the specified length, adding ellipsis if needed.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Formats a single task progress line.
 * @param current - Current task number (1-indexed)
 * @param total - Total number of tasks
 * @param status - Task status
 * @param name - Task name
 * @param elapsedMs - Optional elapsed time in milliseconds
 * @param taskId - Optional task ID prefix display
 * @param model - Optional model short name to display (e.g., "sonnet", "opus", "haiku")
 * @returns Formatted string like "● 001-auth-login (sonnet) 1:23" or "✓ 001-auth-login (opus) 1/5"
 */
export function formatTaskProgress(
  current: number,
  total: number,
  status: TaskStatus,
  name: string,
  elapsedMs?: number,
  taskId?: string,
  model?: string,
  modelOptions: ModelDisplayOptions = {}
): string {
  const symbol = SYMBOLS[status];
  const displayName = truncate(name || 'task', 40);
  const idPrefix = taskId ? `${taskId}-` : '';
  const modelSuffix = formatModelDisplay(model, modelOptions);

  // Show elapsed time for running tasks, completed tasks, and failed tasks
  if (elapsedMs !== undefined) {
    const timeStr = formatElapsedTime(elapsedMs);
    return `${symbol} ${idPrefix}${displayName}${modelSuffix} ${timeStr}`;
  }

  return `${symbol} ${idPrefix}${displayName}${modelSuffix} ${current}/${total}`;
}

/**
 * Formats a model label with optional effort metadata.
 * Examples: "sonnet", "sonnet, low"
 */
export function formatModelMetadata(model: string, options: ModelDisplayOptions = {}): string {
  const parts = [model];
  if (options.effort) {
    parts.push(options.effort);
  }
  return parts.join(', ');
}

/**
 * Formats model metadata for display surfaces that wrap the label in parentheses.
 */
export function formatModelDisplay(model?: string, options: ModelDisplayOptions = {}): string {
  if (!model) {
    return '';
  }
  return ` (${formatModelMetadata(model, options)})`;
}

/**
 * Formats a project header line.
 * @param name - Project name
 * @param taskCount - Number of tasks in the project
 * @returns Formatted string like "▶ my-project (5 tasks)"
 */
export function formatProjectHeader(name: string, taskCount: number): string {
  const displayName = truncate(name || 'project', 50);
  const taskWord = taskCount === 1 ? 'task' : 'tasks';
  return `${SYMBOLS.project} ${displayName} (${taskCount} ${taskWord})`;
}

/**
 * Formats a summary line showing completion status.
 * @param completed - Number of completed tasks
 * @param failed - Number of failed tasks
 * @param pending - Number of pending tasks
 * @param elapsedMs - Optional total elapsed time in milliseconds
 * @param blocked - Number of blocked tasks (default 0)
 * @returns Formatted string like "✓ 5/5 completed in 12:34" or "✗ 3/5 (2 failed, 1 blocked)"
 */
export function formatSummary(
  completed: number,
  failed: number,
  pending: number,
  elapsedMs?: number,
  blocked: number = 0
): string {
  const total = completed + failed + pending + blocked;

  if (total === 0) {
    return `${SYMBOLS.pending} no tasks`;
  }

  const hasFailures = failed > 0;
  const hasBlocked = blocked > 0;
  const symbol = hasFailures || hasBlocked ? SYMBOLS.failed : SYMBOLS.completed;

  if (hasFailures || hasBlocked) {
    const parts: string[] = [];
    if (hasFailures) {
      parts.push(failed === 1 ? '1 failed' : `${failed} failed`);
    }
    if (hasBlocked) {
      parts.push(blocked === 1 ? '1 blocked' : `${blocked} blocked`);
    }
    return `${symbol} ${completed}/${total} (${parts.join(', ')})`;
  }

  const timeStr = elapsedMs !== undefined ? ` in ${formatElapsedTime(elapsedMs)}` : '';
  return `${symbol} ${completed}/${total} completed${timeStr}`;
}

/**
 * Formats a compact progress bar showing task status as a sequence of symbols.
 * @param tasks - Array of task statuses
 * @returns Formatted string like "✓✓●○○"
 */
export function formatProgressBar(tasks: TaskStatus[]): string {
  if (tasks.length === 0) {
    return '';
  }

  return tasks.map((status) => SYMBOLS[status]).join('');
}

/**
 * Formats a number with thousands separators (e.g., 12345 -> "12,345").
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Formats a cost in USD with 2-4 decimal places.
 * Uses 2 decimals for values >= $0.01, 4 decimals for smaller values.
 */
export function formatCost(cost: number | null): string {
  if (cost === null) return 'unavailable';
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Formats a single line of token usage (for a single attempt or total).
 * Used internally by formatTaskTokenSummary.
 */
function formatTokenLine(
  usage: UsageData,
  costValue: number | null,
  prefix: string = '',
  indent: string = '  ',
): string {
  const parts: string[] = [];
  const tokenPart = `${formatNumber(usage.inputTokens)} in / ${formatNumber(usage.outputTokens)} out`;
  parts.push(prefix ? `${prefix}: ${tokenPart}` : `Tokens: ${tokenPart}`);

  if (hasExactCost(costValue)) {
    parts.push(`Cost: ${formatCost(costValue)}`);
  }

  return `${indent}${parts.join(' | ')}`;
}

/**
 * Formats a per-task token usage summary.
 * For single-attempt tasks: "  Tokens: 5,234 in / 1,023 out | Cost: $0.42"
 * For multi-attempt tasks: shows per-attempt breakdown plus total.
 *
 * @param entry - The TaskUsageEntry containing accumulated usage, cost, and attempts array
 */
export function formatTaskTokenSummary(entry: TaskUsageEntry): string {
  // Single-attempt: render exactly as before (no per-attempt breakdown)
  if (entry.attempts.length <= 1) {
    return formatTokenLine(entry.usage, entry.cost.totalCost);
  }

  // Multi-attempt: show per-attempt lines plus total
  const lines: string[] = [];
  entry.attempts.forEach((attemptUsage, i) => {
    const attemptCost = attemptUsage.totalCostUsd;
    lines.push(formatTokenLine(attemptUsage, attemptCost, `Attempt ${i + 1}`, '    '));
  });
  lines.push(formatTokenLine(entry.usage, entry.cost.totalCost, 'Total', '    '));
  return lines.join('\n');
}

/**
 * Formats the grand total token usage summary block.
 * Displayed after all tasks complete.
 *
 * @param usage - Total usage data
 * @param cost - Total cost breakdown
 */
export function formatTokenTotalSummary(
  usage: UsageData,
  cost: CostBreakdown,
): string {
  const lines: string[] = [];
  const divider = '── Token Usage Summary ──────────────────';
  lines.push(divider);
  lines.push(`Total tokens: ${formatNumber(usage.inputTokens)} in / ${formatNumber(usage.outputTokens)} out`);

  if (hasExactCost(cost.totalCost)) {
    lines.push(`Total cost: ${formatCost(cost.totalCost)}`);
  }

  lines.push('─────────────────────────────────────────');
  return lines.join('\n');
}
