import { TokenTracker, CostBreakdown } from '../../src/utils/token-tracker.js';
import { UsageData, PricingConfig, DEFAULT_CONFIG } from '../../src/types/config.js';

function makeUsage(overrides: Partial<UsageData> = {}): UsageData {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    modelUsage: {},
    ...overrides,
  };
}

const testPricing: PricingConfig = DEFAULT_CONFIG.pricing;

describe('TokenTracker', () => {
  describe('calculateCost', () => {
    it('should calculate cost for opus model usage', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        cacheReadInputTokens: 200_000,
        cacheCreationInputTokens: 100_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 500_000,
            cacheReadInputTokens: 200_000,
            cacheCreationInputTokens: 100_000,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(15); // 1M * $15/MTok
      expect(cost.outputCost).toBeCloseTo(37.5); // 0.5M * $75/MTok
      expect(cost.cacheReadCost).toBeCloseTo(0.3); // 0.2M * $1.5/MTok
      expect(cost.cacheCreateCost).toBeCloseTo(1.875); // 0.1M * $18.75/MTok
      expect(cost.totalCost).toBeCloseTo(15 + 37.5 + 0.3 + 1.875);
    });

    it('should calculate cost for sonnet model usage', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5-20250929': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(3); // 1M * $3/MTok
      expect(cost.outputCost).toBeCloseTo(15); // 1M * $15/MTok
      expect(cost.totalCost).toBeCloseTo(18);
    });

    it('should calculate cost for haiku model usage', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 2_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-haiku-4-5-20251001': {
            inputTokens: 2_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(2); // 2M * $1/MTok
      expect(cost.outputCost).toBeCloseTo(5); // 1M * $5/MTok
      expect(cost.totalCost).toBeCloseTo(7);
    });

    it('should handle multi-model usage in a single task', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 2_000_000,
        outputTokens: 1_500_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 500_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
          'claude-haiku-4-5-20251001': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      // Opus: 1M*$15 + 0.5M*$75 = $15 + $37.5
      // Haiku: 1M*$1 + 1M*$5 = $1 + $5
      expect(cost.inputCost).toBeCloseTo(16); // 15 + 1
      expect(cost.outputCost).toBeCloseTo(42.5); // 37.5 + 5
      expect(cost.totalCost).toBeCloseTo(58.5);
    });

    it('should fallback to sonnet pricing when no model breakdown', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {},
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(3); // sonnet fallback
      expect(cost.outputCost).toBeCloseTo(15);
      expect(cost.totalCost).toBeCloseTo(18);
    });

    it('should fallback to sonnet pricing for unknown model families', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-unknown-3-0': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(3); // sonnet fallback
      expect(cost.outputCost).toBeCloseTo(15);
    });

    it('should return zero cost for zero tokens', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage();
      const cost = tracker.calculateCost(usage);
      expect(cost.totalCost).toBe(0);
    });

    it('should apply cache read discount correctly', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({
        cacheReadInputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadInputTokens: 1_000_000,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      // Cache read: 1M * $0.30/MTok = $0.30 (90% off $3 input price)
      expect(cost.cacheReadCost).toBeCloseTo(0.3);
      expect(cost.totalCost).toBeCloseTo(0.3);
    });
  });

  describe('addTask and accumulation', () => {
    it('should accumulate usage across multiple tasks', () => {
      const tracker = new TokenTracker(testPricing);

      tracker.addTask('01', makeUsage({
        inputTokens: 500_000,
        outputTokens: 200_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 500_000,
            outputTokens: 200_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      tracker.addTask('02', makeUsage({
        inputTokens: 300_000,
        outputTokens: 100_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 300_000,
            outputTokens: 100_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(800_000);
      expect(totals.usage.outputTokens).toBe(300_000);
      expect(totals.usage.modelUsage['claude-opus-4-6']?.inputTokens).toBe(800_000);
      expect(totals.usage.modelUsage['claude-opus-4-6']?.outputTokens).toBe(300_000);
    });

    it('should accumulate costs across multiple tasks', () => {
      const tracker = new TokenTracker(testPricing);

      const entry1 = tracker.addTask('01', makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      const entry2 = tracker.addTask('02', makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      const totals = tracker.getTotals();
      // Each task: $3 input + $15 output = $18
      expect(entry1.cost.totalCost).toBeCloseTo(18);
      expect(entry2.cost.totalCost).toBeCloseTo(18);
      expect(totals.cost.totalCost).toBeCloseTo(36);
    });

    it('should accumulate multi-model usage across tasks', () => {
      const tracker = new TokenTracker(testPricing);

      tracker.addTask('01', makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 500_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      tracker.addTask('02', makeUsage({
        inputTokens: 500_000,
        outputTokens: 200_000,
        modelUsage: {
          'claude-haiku-4-5-20251001': {
            inputTokens: 500_000,
            outputTokens: 200_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      const totals = tracker.getTotals();
      expect(totals.usage.modelUsage['claude-opus-4-6']?.inputTokens).toBe(1_000_000);
      expect(totals.usage.modelUsage['claude-haiku-4-5-20251001']?.inputTokens).toBe(500_000);
    });

    it('should return empty totals when no tasks added', () => {
      const tracker = new TokenTracker(testPricing);
      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(0);
      expect(totals.usage.outputTokens).toBe(0);
      expect(totals.cost.totalCost).toBe(0);
      expect(Object.keys(totals.usage.modelUsage)).toHaveLength(0);
    });

    it('should return per-task entries', () => {
      const tracker = new TokenTracker(testPricing);
      tracker.addTask('01', makeUsage({ inputTokens: 100 }));
      tracker.addTask('02', makeUsage({ inputTokens: 200 }));

      const entries = tracker.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].taskId).toBe('01');
      expect(entries[1].taskId).toBe('02');
    });

    it('addTask returns the entry with cost', () => {
      const tracker = new TokenTracker(testPricing);
      const entry = tracker.addTask('01', makeUsage({
        inputTokens: 1_000_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      }));

      expect(entry.taskId).toBe('01');
      expect(entry.cost.inputCost).toBeCloseTo(15);
      expect(entry.cost.totalCost).toBeCloseTo(15);
    });
  });

  describe('custom pricing', () => {
    it('should use custom pricing config', () => {
      const customPricing: PricingConfig = {
        opus: { inputPerMTok: 10, outputPerMTok: 50, cacheReadPerMTok: 1, cacheCreatePerMTok: 12.5 },
        sonnet: { inputPerMTok: 2, outputPerMTok: 10, cacheReadPerMTok: 0.2, cacheCreatePerMTok: 2.5 },
        haiku: { inputPerMTok: 0.5, outputPerMTok: 2.5, cacheReadPerMTok: 0.05, cacheCreatePerMTok: 0.625 },
      };

      const tracker = new TokenTracker(customPricing);
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 1_000_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const cost = tracker.calculateCost(usage);
      expect(cost.inputCost).toBeCloseTo(10); // 1M * $10/MTok
      expect(cost.outputCost).toBeCloseTo(50); // 1M * $50/MTok
      expect(cost.totalCost).toBeCloseTo(60);
    });
  });
});
