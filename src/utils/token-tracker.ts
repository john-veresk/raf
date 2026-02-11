import { UsageData, PricingConfig } from '../types/config.js';
import { resolveModelPricingCategory, getPricingConfig, getRateLimitWindowConfig } from './config.js';

/** Cost breakdown for a single task or accumulated total. */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheCreateCost: number;
  totalCost: number;
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
  const result: CostBreakdown = {
    inputCost: 0,
    outputCost: 0,
    cacheReadCost: 0,
    cacheCreateCost: 0,
    totalCost: 0,
  };

  for (const cost of costs) {
    result.inputCost += cost.inputCost;
    result.outputCost += cost.outputCost;
    result.cacheReadCost += cost.cacheReadCost;
    result.cacheCreateCost += cost.cacheCreateCost;
    result.totalCost += cost.totalCost;
  }

  return result;
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
      } else {
        result.modelUsage[modelId] = { ...modelUsage };
      }
    }
  }

  return result;
}

/**
 * Accumulates token usage across multiple task executions and calculates costs
 * using configurable per-model pricing.
 */
export class TokenTracker {
  private entries: TaskUsageEntry[] = [];
  private pricingConfig: PricingConfig;

  constructor(pricingConfig?: PricingConfig) {
    this.pricingConfig = pricingConfig ?? getPricingConfig();
  }

  /**
   * Record usage data from a completed task.
   * Accepts an array of UsageData (one per attempt) and accumulates them.
   * Cost is calculated per-attempt to avoid underreporting when some attempts
   * have modelUsage and others only have aggregate fields.
   */
  addTask(taskId: string, attempts: UsageData[]): TaskUsageEntry {
    const usage = accumulateUsage(attempts);
    // Calculate cost per-attempt, then sum. This ensures attempts with only
    // aggregate fields use sonnet fallback pricing independently.
    const perAttemptCosts = attempts.map((attempt) => this.calculateCost(attempt));
    const cost = sumCostBreakdowns(perAttemptCosts);
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
    };
    const totalCost: CostBreakdown = {
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheCreateCost: 0,
      totalCost: 0,
    };

    for (const entry of this.entries) {
      totalUsage.inputTokens += entry.usage.inputTokens;
      totalUsage.outputTokens += entry.usage.outputTokens;
      totalUsage.cacheReadInputTokens += entry.usage.cacheReadInputTokens;
      totalUsage.cacheCreationInputTokens += entry.usage.cacheCreationInputTokens;

      // Merge per-model usage
      for (const [modelId, modelUsage] of Object.entries(entry.usage.modelUsage)) {
        const existing = totalUsage.modelUsage[modelId];
        if (existing) {
          existing.inputTokens += modelUsage.inputTokens;
          existing.outputTokens += modelUsage.outputTokens;
          existing.cacheReadInputTokens += modelUsage.cacheReadInputTokens;
          existing.cacheCreationInputTokens += modelUsage.cacheCreationInputTokens;
        } else {
          totalUsage.modelUsage[modelId] = { ...modelUsage };
        }
      }

      totalCost.inputCost += entry.cost.inputCost;
      totalCost.outputCost += entry.cost.outputCost;
      totalCost.cacheReadCost += entry.cost.cacheReadCost;
      totalCost.cacheCreateCost += entry.cost.cacheCreateCost;
      totalCost.totalCost += entry.cost.totalCost;
    }

    return { usage: totalUsage, cost: totalCost };
  }

  /**
   * Calculate cost for a given UsageData using per-model pricing.
   * Uses per-model breakdown when available, falls back to aggregate with sonnet pricing.
   */
  calculateCost(usage: UsageData): CostBreakdown {
    const result: CostBreakdown = {
      inputCost: 0,
      outputCost: 0,
      cacheReadCost: 0,
      cacheCreateCost: 0,
      totalCost: 0,
    };

    const modelEntries = Object.entries(usage.modelUsage);

    if (modelEntries.length > 0) {
      // Use per-model breakdown for accurate pricing
      for (const [modelId, modelUsage] of modelEntries) {
        const category = resolveModelPricingCategory(modelId);
        const pricing = this.pricingConfig[category ?? 'sonnet'];

        result.inputCost += (modelUsage.inputTokens / 1_000_000) * pricing.inputPerMTok;
        result.outputCost += (modelUsage.outputTokens / 1_000_000) * pricing.outputPerMTok;
        result.cacheReadCost += (modelUsage.cacheReadInputTokens / 1_000_000) * pricing.cacheReadPerMTok;
        result.cacheCreateCost += (modelUsage.cacheCreationInputTokens / 1_000_000) * pricing.cacheCreatePerMTok;
      }
    } else {
      // Fallback: use aggregate totals with sonnet pricing
      const pricing = this.pricingConfig.sonnet;
      result.inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPerMTok;
      result.outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPerMTok;
      result.cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheReadPerMTok;
      result.cacheCreateCost = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheCreatePerMTok;
    }

    result.totalCost = result.inputCost + result.outputCost + result.cacheReadCost + result.cacheCreateCost;
    return result;
  }

  /**
   * Calculate the 5h rate limit window percentage for a given cost.
   * Converts cost to Sonnet-equivalent tokens using the configured Sonnet pricing,
   * then divides by the configured cap.
   *
   * @param totalCost - The total cost in dollars
   * @param sonnetTokenCap - Optional override for the Sonnet-equivalent token cap (defaults to config value)
   * @returns The percentage of the 5h window consumed (0-100+)
   */
  calculateRateLimitPercentage(totalCost: number, sonnetTokenCap?: number): number {
    if (totalCost === 0) return 0;

    // Get the configured cap or use the provided override
    const cap = sonnetTokenCap ?? getRateLimitWindowConfig().sonnetTokenCap;

    // Calculate the average Sonnet cost per token
    // Using the average of input and output pricing (simplified approach)
    const sonnetPricing = this.pricingConfig.sonnet;
    const avgSonnetCostPerToken = (sonnetPricing.inputPerMTok + sonnetPricing.outputPerMTok) / 2 / 1_000_000;

    // Convert cost to Sonnet-equivalent tokens
    const sonnetEquivalentTokens = totalCost / avgSonnetCostPerToken;

    // Calculate percentage
    return (sonnetEquivalentTokens / cap) * 100;
  }

  /**
   * Get the cumulative 5h window percentage across all recorded tasks.
   */
  getCumulativeRateLimitPercentage(sonnetTokenCap?: number): number {
    const totals = this.getTotals();
    return this.calculateRateLimitPercentage(totals.cost.totalCost, sonnetTokenCap);
  }
}
