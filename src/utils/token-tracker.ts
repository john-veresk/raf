import { UsageData } from '../types/config.js';

/** Cost breakdown for a single task or accumulated total. */
export interface CostBreakdown {
  totalCost: number | null;
}

/** Per-task usage snapshot stored by the tracker. */
export interface TaskUsageEntry {
  taskId: string;
  /** Accumulated usage across all attempts. */
  usage: UsageData;
  /** Cost breakdown for accumulated usage. */
  cost: CostBreakdown;
  /** Raw per-attempt usage data (for display breakdowns). */
  attempts: UsageData[];
}

/**
 * Sum multiple CostBreakdown objects into a single total.
 */
export function sumCostBreakdowns(costs: CostBreakdown[]): CostBreakdown {
  let totalCost = 0;
  for (const cost of costs) {
    if (cost.totalCost === null) {
      return { totalCost: null };
    }
    totalCost += cost.totalCost;
  }
  return { totalCost };
}

/**
 * Merge multiple UsageData objects into a single accumulated UsageData.
 * Sums all token fields and merges modelUsage maps.
 */
export function accumulateUsage(attempts: UsageData[]): UsageData {
  const result: UsageData = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    modelUsage: {},
    totalCostUsd: 0,
  };

  for (const attempt of attempts) {
    result.inputTokens += attempt.inputTokens;
    result.outputTokens += attempt.outputTokens;
    result.cacheReadInputTokens += attempt.cacheReadInputTokens;
    result.cacheCreationInputTokens += attempt.cacheCreationInputTokens;

    // Merge per-model usage
    for (const [modelId, modelUsage] of Object.entries(attempt.modelUsage)) {
      const existing = result.modelUsage[modelId];
      if (existing) {
        existing.inputTokens += modelUsage.inputTokens;
        existing.outputTokens += modelUsage.outputTokens;
        existing.cacheReadInputTokens += modelUsage.cacheReadInputTokens;
        existing.cacheCreationInputTokens += modelUsage.cacheCreationInputTokens;
        if (existing.costUsd === null || modelUsage.costUsd === null || existing.costUsd === undefined || modelUsage.costUsd === undefined) {
          existing.costUsd = null;
        } else {
          existing.costUsd += modelUsage.costUsd;
        }
      } else {
        result.modelUsage[modelId] = { ...modelUsage };
      }
    }

    if (result.totalCostUsd !== null) {
      if (attempt.totalCostUsd === null) {
        result.totalCostUsd = null;
      } else {
        result.totalCostUsd += attempt.totalCostUsd;
      }
    }
  }

  return result;
}

/**
 * Accumulates token usage across multiple task executions using CLI-provided cost data.
 */
export class TokenTracker {
  private entries: TaskUsageEntry[] = [];

  constructor() {
    // No pricing config needed - costs come from the CLI
  }

  /**
   * Record usage data from a completed task.
   * Accepts an array of UsageData (one per attempt) and accumulates them.
   * Costs are summed from CLI-provided totalCostUsd values.
   */
  addTask(taskId: string, attempts: UsageData[]): TaskUsageEntry {
    const usage = accumulateUsage(attempts);
    const totalCost = usage.totalCostUsd;
    const cost: CostBreakdown = { totalCost };
    const entry: TaskUsageEntry = { taskId, usage, cost, attempts };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Get all recorded task entries.
   */
  getEntries(): readonly TaskUsageEntry[] {
    return this.entries;
  }

  /**
   * Get accumulated totals across all tasks.
   */
  getTotals(): { usage: UsageData; cost: CostBreakdown } {
    const totalUsage: UsageData = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {},
      totalCostUsd: 0,
    };
    const totalCost: CostBreakdown = {
      totalCost: 0,
    };

    for (const entry of this.entries) {
      totalUsage.inputTokens += entry.usage.inputTokens;
      totalUsage.outputTokens += entry.usage.outputTokens;
      totalUsage.cacheReadInputTokens += entry.usage.cacheReadInputTokens;
      totalUsage.cacheCreationInputTokens += entry.usage.cacheCreationInputTokens;
      if (totalUsage.totalCostUsd !== null) {
        if (entry.usage.totalCostUsd === null) {
          totalUsage.totalCostUsd = null;
        } else {
          totalUsage.totalCostUsd += entry.usage.totalCostUsd;
        }
      }

      // Merge per-model usage
      for (const [modelId, modelUsage] of Object.entries(entry.usage.modelUsage)) {
        const existing = totalUsage.modelUsage[modelId];
        if (existing) {
          existing.inputTokens += modelUsage.inputTokens;
          existing.outputTokens += modelUsage.outputTokens;
          existing.cacheReadInputTokens += modelUsage.cacheReadInputTokens;
          existing.cacheCreationInputTokens += modelUsage.cacheCreationInputTokens;
          if (existing.costUsd === null || modelUsage.costUsd === null || existing.costUsd === undefined || modelUsage.costUsd === undefined) {
            existing.costUsd = null;
          } else {
            existing.costUsd += modelUsage.costUsd;
          }
        } else {
          totalUsage.modelUsage[modelId] = { ...modelUsage };
        }
      }

      if (totalCost.totalCost !== null) {
        if (entry.cost.totalCost === null) {
          totalCost.totalCost = null;
        } else {
          totalCost.totalCost += entry.cost.totalCost;
        }
      }
    }

    return { usage: totalUsage, cost: totalCost };
  }

}
