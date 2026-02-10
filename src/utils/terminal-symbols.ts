/**
 * Terminal symbols and formatting helpers for beautiful terminal output.
 * All functions are pure and testable - no side effects.
 */

import { formatElapsedTime } from './timer.js';
import type { UsageData } from '../types/config.js';
import type { CostBreakdown } from './token-tracker.js';

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
 * @returns Formatted string like "● 001-auth-login 1:23" or "✓ 001-auth-login 1/5"
 */
export function formatTaskProgress(
  current: number,
  total: number,
  status: TaskStatus,
  name: string,
  elapsedMs?: number,
  taskId?: string
): string {
  const symbol = SYMBOLS[status];
  const displayName = truncate(name || 'task', 40);
  const idPrefix = taskId ? `${taskId}-` : '';

  // Show elapsed time for running tasks, completed tasks, and failed tasks
  if (elapsedMs !== undefined) {
    const timeStr = formatElapsedTime(elapsedMs);
    return `${symbol} ${idPrefix}${displayName} ${timeStr}`;
  }

  return `${symbol} ${idPrefix}${displayName} ${current}/${total}`;
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
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Formats a per-task token usage summary line.
 * Example: "  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42"
 */
export function formatTaskTokenSummary(usage: UsageData, cost: CostBreakdown): string {
  const parts: string[] = [];
  parts.push(`Tokens: ${formatNumber(usage.inputTokens)} in / ${formatNumber(usage.outputTokens)} out`);

  const cacheTotal = usage.cacheReadInputTokens + usage.cacheCreationInputTokens;
  if (cacheTotal > 0) {
    if (usage.cacheReadInputTokens > 0 && usage.cacheCreationInputTokens > 0) {
      parts.push(`Cache: ${formatNumber(usage.cacheReadInputTokens)} read / ${formatNumber(usage.cacheCreationInputTokens)} created`);
    } else if (usage.cacheReadInputTokens > 0) {
      parts.push(`Cache: ${formatNumber(usage.cacheReadInputTokens)} read`);
    } else {
      parts.push(`Cache: ${formatNumber(usage.cacheCreationInputTokens)} created`);
    }
  }

  parts.push(`Est. cost: ${formatCost(cost.totalCost)}`);
  return `  ${parts.join(' | ')}`;
}

/**
 * Formats the grand total token usage summary block.
 * Displayed after all tasks complete.
 */
export function formatTokenTotalSummary(usage: UsageData, cost: CostBreakdown): string {
  const lines: string[] = [];
  const divider = '── Token Usage Summary ──────────────────';
  lines.push(divider);
  lines.push(`Total tokens: ${formatNumber(usage.inputTokens)} in / ${formatNumber(usage.outputTokens)} out`);

  if (usage.cacheReadInputTokens > 0 || usage.cacheCreationInputTokens > 0) {
    const cacheParts: string[] = [];
    if (usage.cacheReadInputTokens > 0) {
      cacheParts.push(`${formatNumber(usage.cacheReadInputTokens)} read`);
    }
    if (usage.cacheCreationInputTokens > 0) {
      cacheParts.push(`${formatNumber(usage.cacheCreationInputTokens)} created`);
    }
    lines.push(`Cache: ${cacheParts.join(' / ')}`);
  }

  lines.push(`Estimated cost: ${formatCost(cost.totalCost)}`);
  lines.push('─────────────────────────────────────────');
  return lines.join('\n');
}
