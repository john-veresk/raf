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

function mergeCostUsd(existing: number | null | undefined, incoming: number | null | undefined): number | null {
  if (existing === null || incoming === null || existing === undefined || incoming === undefined) {
    return null;
  }
  return existing + incoming;
}

/**
 * Merge usage data into an accumulated snapshot.
 * Handles undefined input for first-event initialization.
 */
export function mergeUsageData(existing: UsageData | undefined, incoming: UsageData | undefined): UsageData | undefined {
  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return {
      inputTokens: incoming.inputTokens ?? 0,
      outputTokens: incoming.outputTokens ?? 0,
      modelUsage: Object.fromEntries(
        Object.entries(incoming.modelUsage ?? {}).map(([modelId, usage]) => [
          modelId,
          {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            costUsd: usage.costUsd ?? null,
          },
        ]),
      ),
      totalCostUsd: incoming.totalCostUsd ?? null,
    };
  }

  const merged: UsageData = {
    inputTokens: (existing.inputTokens ?? 0) + (incoming.inputTokens ?? 0),
    outputTokens: (existing.outputTokens ?? 0) + (incoming.outputTokens ?? 0),
    modelUsage: {},
    totalCostUsd: mergeCostUsd(existing.totalCostUsd, incoming.totalCostUsd),
  };

  const allModelIds = new Set([
    ...Object.keys(existing.modelUsage ?? {}),
    ...Object.keys(incoming.modelUsage ?? {}),
  ]);

  for (const modelId of allModelIds) {
    const existingModel = existing.modelUsage?.[modelId];
    const incomingModel = incoming.modelUsage?.[modelId];
    merged.modelUsage[modelId] = {
      inputTokens: (existingModel?.inputTokens ?? 0) + (incomingModel?.inputTokens ?? 0),
      outputTokens: (existingModel?.outputTokens ?? 0) + (incomingModel?.outputTokens ?? 0),
      costUsd: mergeCostUsd(existingModel?.costUsd, incomingModel?.costUsd),
    };
  }

  return merged;
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
  let result: UsageData | undefined;
  for (const attempt of attempts) {
    result = mergeUsageData(result, attempt);
  }

  return result ?? {
    inputTokens: 0,
    outputTokens: 0,
    modelUsage: {},
    totalCostUsd: 0,
  };
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
    let totalUsage: UsageData | undefined;
    const totalCost: CostBreakdown = {
      totalCost: 0,
    };

    for (const entry of this.entries) {
      totalUsage = mergeUsageData(totalUsage, entry.usage);

      if (totalCost.totalCost !== null) {
        if (entry.cost.totalCost === null) {
          totalCost.totalCost = null;
        } else {
          totalCost.totalCost += entry.cost.totalCost;
        }
      }
    }

    return {
      usage: totalUsage ?? {
        inputTokens: 0,
        outputTokens: 0,
        modelUsage: {},
        totalCostUsd: 0,
      },
      cost: totalCost,
    };
  }

}
