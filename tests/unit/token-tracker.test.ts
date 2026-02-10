import { TokenTracker, CostBreakdown, accumulateUsage } from '../../src/utils/token-tracker.js';
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

      tracker.addTask('01', [makeUsage({
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
      })]);

      tracker.addTask('02', [makeUsage({
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
      })]);

      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(800_000);
      expect(totals.usage.outputTokens).toBe(300_000);
      expect(totals.usage.modelUsage['claude-opus-4-6']?.inputTokens).toBe(800_000);
      expect(totals.usage.modelUsage['claude-opus-4-6']?.outputTokens).toBe(300_000);
    });

    it('should accumulate costs across multiple tasks', () => {
      const tracker = new TokenTracker(testPricing);

      const entry1 = tracker.addTask('01', [makeUsage({
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
      })]);

      const entry2 = tracker.addTask('02', [makeUsage({
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
      })]);

      const totals = tracker.getTotals();
      // Each task: $3 input + $15 output = $18
      expect(entry1.cost.totalCost).toBeCloseTo(18);
      expect(entry2.cost.totalCost).toBeCloseTo(18);
      expect(totals.cost.totalCost).toBeCloseTo(36);
    });

    it('should accumulate multi-model usage across tasks', () => {
      const tracker = new TokenTracker(testPricing);

      tracker.addTask('01', [makeUsage({
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
      })]);

      tracker.addTask('02', [makeUsage({
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
      })]);

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
      tracker.addTask('01', [makeUsage({ inputTokens: 100 })]);
      tracker.addTask('02', [makeUsage({ inputTokens: 200 })]);

      const entries = tracker.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].taskId).toBe('01');
      expect(entries[1].taskId).toBe('02');
    });

    it('addTask returns the entry with cost', () => {
      const tracker = new TokenTracker(testPricing);
      const entry = tracker.addTask('01', [makeUsage({
        inputTokens: 1_000_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 1_000_000,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      })]);

      expect(entry.taskId).toBe('01');
      expect(entry.cost.inputCost).toBeCloseTo(15);
      expect(entry.cost.totalCost).toBeCloseTo(15);
    });

    it('should store attempts array in entry', () => {
      const tracker = new TokenTracker(testPricing);
      const usage = makeUsage({ inputTokens: 100 });
      const entry = tracker.addTask('01', [usage]);

      expect(entry.attempts).toHaveLength(1);
      expect(entry.attempts[0]).toEqual(usage);
    });

    it('should accumulate multiple attempts for a single task', () => {
      const tracker = new TokenTracker(testPricing);
      const attempt1 = makeUsage({
        inputTokens: 500_000,
        outputTokens: 100_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 500_000,
            outputTokens: 100_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });
      const attempt2 = makeUsage({
        inputTokens: 600_000,
        outputTokens: 200_000,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 600_000,
            outputTokens: 200_000,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);

      expect(entry.usage.inputTokens).toBe(1_100_000);
      expect(entry.usage.outputTokens).toBe(300_000);
      expect(entry.usage.modelUsage['claude-opus-4-6']?.inputTokens).toBe(1_100_000);
      expect(entry.attempts).toHaveLength(2);
    });

    it('should correctly accumulate multi-attempt costs', () => {
      const tracker = new TokenTracker(testPricing);
      const attempt1 = makeUsage({
        inputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 1_000_000,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });
      const attempt2 = makeUsage({
        inputTokens: 1_000_000,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 1_000_000,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);

      // 2M tokens * $3/MTok = $6
      expect(entry.cost.inputCost).toBeCloseTo(6);
      expect(entry.cost.totalCost).toBeCloseTo(6);
    });
  });

  describe('accumulateUsage', () => {
    it('should return empty usage for empty array', () => {
      const result = accumulateUsage([]);
      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
      expect(result.cacheReadInputTokens).toBe(0);
      expect(result.cacheCreationInputTokens).toBe(0);
      expect(Object.keys(result.modelUsage)).toHaveLength(0);
    });

    it('should return same usage for single-element array', () => {
      const usage = makeUsage({
        inputTokens: 100,
        outputTokens: 200,
        cacheReadInputTokens: 50,
        cacheCreationInputTokens: 25,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 100,
            outputTokens: 200,
            cacheReadInputTokens: 50,
            cacheCreationInputTokens: 25,
          },
        },
      });

      const result = accumulateUsage([usage]);
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(200);
      expect(result.cacheReadInputTokens).toBe(50);
      expect(result.cacheCreationInputTokens).toBe(25);
      expect(result.modelUsage['claude-opus-4-6']?.inputTokens).toBe(100);
    });

    it('should sum all token fields across attempts', () => {
      const attempt1 = makeUsage({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadInputTokens: 10,
        cacheCreationInputTokens: 5,
      });
      const attempt2 = makeUsage({
        inputTokens: 200,
        outputTokens: 100,
        cacheReadInputTokens: 20,
        cacheCreationInputTokens: 10,
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.cacheReadInputTokens).toBe(30);
      expect(result.cacheCreationInputTokens).toBe(15);
    });

    it('should merge modelUsage for same model across attempts', () => {
      const attempt1 = makeUsage({
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 10,
            cacheCreationInputTokens: 5,
          },
        },
      });
      const attempt2 = makeUsage({
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 200,
            outputTokens: 100,
            cacheReadInputTokens: 20,
            cacheCreationInputTokens: 10,
          },
        },
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.modelUsage['claude-opus-4-6']?.inputTokens).toBe(300);
      expect(result.modelUsage['claude-opus-4-6']?.outputTokens).toBe(150);
      expect(result.modelUsage['claude-opus-4-6']?.cacheReadInputTokens).toBe(30);
      expect(result.modelUsage['claude-opus-4-6']?.cacheCreationInputTokens).toBe(15);
    });

    it('should handle different models across attempts', () => {
      const attempt1 = makeUsage({
        inputTokens: 100,
        outputTokens: 50,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });
      const attempt2 = makeUsage({
        inputTokens: 200,
        outputTokens: 100,
        modelUsage: {
          'claude-sonnet-4-5': {
            inputTokens: 200,
            outputTokens: 100,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.modelUsage['claude-opus-4-6']?.inputTokens).toBe(100);
      expect(result.modelUsage['claude-sonnet-4-5']?.inputTokens).toBe(200);
      expect(Object.keys(result.modelUsage)).toHaveLength(2);
    });

    it('should handle mixed model usage across attempts', () => {
      const attempt1 = makeUsage({
        inputTokens: 300,
        outputTokens: 150,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 200,
            outputTokens: 100,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
          'claude-haiku-4-5': {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });
      const attempt2 = makeUsage({
        inputTokens: 400,
        outputTokens: 200,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
          'claude-sonnet-4-5': {
            inputTokens: 300,
            outputTokens: 150,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.inputTokens).toBe(700);
      expect(result.outputTokens).toBe(350);
      // Opus: 200 + 100 = 300
      expect(result.modelUsage['claude-opus-4-6']?.inputTokens).toBe(300);
      // Haiku: only from attempt1
      expect(result.modelUsage['claude-haiku-4-5']?.inputTokens).toBe(100);
      // Sonnet: only from attempt2
      expect(result.modelUsage['claude-sonnet-4-5']?.inputTokens).toBe(300);
    });

    it('should not mutate input objects', () => {
      const attempt1 = makeUsage({
        inputTokens: 100,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 100,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });
      const attempt2 = makeUsage({
        inputTokens: 200,
        modelUsage: {
          'claude-opus-4-6': {
            inputTokens: 200,
            outputTokens: 0,
            cacheReadInputTokens: 0,
            cacheCreationInputTokens: 0,
          },
        },
      });

      accumulateUsage([attempt1, attempt2]);

      expect(attempt1.inputTokens).toBe(100);
      expect(attempt1.modelUsage['claude-opus-4-6']?.inputTokens).toBe(100);
      expect(attempt2.inputTokens).toBe(200);
    });
  });

  describe('multi-attempt cost calculation', () => {
    it('should calculate correct cost when retry uses different model', () => {
      const tracker = new TokenTracker(testPricing);
      // Attempt 1: Opus, Attempt 2: Sonnet (fallback)
      const attempt1 = makeUsage({
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
      });
      const attempt2 = makeUsage({
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
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);

      // Opus: 1M*$15 + 0.5M*$75 = $15 + $37.5 = $52.5
      // Sonnet: 1M*$3 + 1M*$15 = $3 + $15 = $18
      // Total: $52.5 + $18 = $70.5
      expect(entry.cost.inputCost).toBeCloseTo(18); // 15 + 3
      expect(entry.cost.outputCost).toBeCloseTo(52.5); // 37.5 + 15
      expect(entry.cost.totalCost).toBeCloseTo(70.5);
    });

    it('should include all attempt usage in grand totals', () => {
      const tracker = new TokenTracker(testPricing);

      // Task 1: 2 attempts
      tracker.addTask('01', [
        makeUsage({ inputTokens: 500_000 }),
        makeUsage({ inputTokens: 500_000 }),
      ]);

      // Task 2: 1 attempt
      tracker.addTask('02', [
        makeUsage({ inputTokens: 1_000_000 }),
      ]);

      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(2_000_000);
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
