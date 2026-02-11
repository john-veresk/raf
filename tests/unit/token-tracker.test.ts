import { TokenTracker, CostBreakdown, accumulateUsage, sumCostBreakdowns } from '../../src/utils/token-tracker.js';
import { UsageData } from '../../src/types/config.js';

function makeUsage(overrides: Partial<UsageData> = {}): UsageData {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    modelUsage: {},
    totalCostUsd: 0, // Default to 0 instead of undefined
    ...overrides,
  };
}

describe('TokenTracker', () => {
  describe('constructor', () => {
    it('should create tracker without parameters', () => {
      const tracker = new TokenTracker();
      expect(tracker).toBeDefined();
    });
  });

  describe('addTask with Claude-provided costs', () => {
    it('should sum totalCostUsd from single attempt', () => {
      const tracker = new TokenTracker();
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 52.5,
      });

      const entry = tracker.addTask('01', [usage]);
      expect(entry.cost.totalCost).toBe(52.5);
      expect(entry.usage.inputTokens).toBe(1_000_000);
      expect(entry.usage.outputTokens).toBe(500_000);
    });

    it('should sum totalCostUsd from multiple attempts', () => {
      const tracker = new TokenTracker();
      const attempt1 = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 25.0,
      });
      const attempt2 = makeUsage({
        inputTokens: 500_000,
        outputTokens: 250_000,
        totalCostUsd: 12.5,
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);
      expect(entry.cost.totalCost).toBe(37.5);
      expect(entry.usage.inputTokens).toBe(1_500_000);
      expect(entry.usage.outputTokens).toBe(750_000);
    });

    it('should handle missing totalCostUsd gracefully', () => {
      const tracker = new TokenTracker();
      // makeUsage() now defaults totalCostUsd to 0
      const usage = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 0,
      });

      const entry = tracker.addTask('01', [usage]);
      expect(entry.cost.totalCost).toBe(0);
    });

    it('should handle mixed attempts with and without costs', () => {
      const tracker = new TokenTracker();
      const attempt1 = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 25.0,
      });
      const attempt2 = makeUsage({
        inputTokens: 500_000,
        outputTokens: 250_000,
        totalCostUsd: 0, // explicitly 0 means no cost
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);
      expect(entry.cost.totalCost).toBe(25.0);
    });

    it('should store attempts array in entry', () => {
      const tracker = new TokenTracker();
      const usage = makeUsage({ inputTokens: 100, totalCostUsd: 0.01 });
      const entry = tracker.addTask('01', [usage]);

      expect(entry.attempts).toHaveLength(1);
      expect(entry.attempts[0]).toEqual(usage);
    });

    it('should handle zero cost', () => {
      const tracker = new TokenTracker();
      const usage = makeUsage({
        inputTokens: 100,
        outputTokens: 50,
        totalCostUsd: 0,
      });

      const entry = tracker.addTask('01', [usage]);
      expect(entry.cost.totalCost).toBe(0);
    });
  });

  describe('getTotals', () => {
    it('should accumulate costs across multiple tasks', () => {
      const tracker = new TokenTracker();

      tracker.addTask('01', [makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 18.0,
      })]);

      tracker.addTask('02', [makeUsage({
        inputTokens: 500_000,
        outputTokens: 250_000,
        totalCostUsd: 9.0,
      })]);

      const totals = tracker.getTotals();
      expect(totals.cost.totalCost).toBe(27.0);
      expect(totals.usage.inputTokens).toBe(1_500_000);
      expect(totals.usage.outputTokens).toBe(750_000);
    });

    it('should return empty totals when no tasks added', () => {
      const tracker = new TokenTracker();
      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(0);
      expect(totals.usage.outputTokens).toBe(0);
      expect(totals.cost.totalCost).toBe(0);
      expect(Object.keys(totals.usage.modelUsage)).toHaveLength(0);
    });

    it('should accumulate usage across multiple tasks', () => {
      const tracker = new TokenTracker();

      tracker.addTask('01', [makeUsage({
        inputTokens: 500_000,
        outputTokens: 200_000,
        totalCostUsd: 10.0,
      })]);

      tracker.addTask('02', [makeUsage({
        inputTokens: 300_000,
        outputTokens: 100_000,
        totalCostUsd: 5.0,
      })]);

      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(800_000);
      expect(totals.usage.outputTokens).toBe(300_000);
    });

    it('should accumulate cache tokens', () => {
      const tracker = new TokenTracker();

      tracker.addTask('01', [makeUsage({
        inputTokens: 100_000,
        cacheReadInputTokens: 50_000,
        cacheCreationInputTokens: 20_000,
        totalCostUsd: 2.0,
      })]);

      tracker.addTask('02', [makeUsage({
        inputTokens: 100_000,
        cacheReadInputTokens: 30_000,
        cacheCreationInputTokens: 10_000,
        totalCostUsd: 1.5,
      })]);

      const totals = tracker.getTotals();
      expect(totals.usage.cacheReadInputTokens).toBe(80_000);
      expect(totals.usage.cacheCreationInputTokens).toBe(30_000);
    });

    it('should accumulate multi-model usage across tasks', () => {
      const tracker = new TokenTracker();

      tracker.addTask('01', [makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 52.5,
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
        totalCostUsd: 6.0,
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
  });

  describe('getEntries', () => {
    it('should return per-task entries', () => {
      const tracker = new TokenTracker();
      tracker.addTask('01', [makeUsage({ inputTokens: 100, totalCostUsd: 0.01 })]);
      tracker.addTask('02', [makeUsage({ inputTokens: 200, totalCostUsd: 0.02 })]);

      const entries = tracker.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].taskId).toBe('01');
      expect(entries[1].taskId).toBe('02');
      expect(entries[0].cost.totalCost).toBe(0.01);
      expect(entries[1].cost.totalCost).toBe(0.02);
    });
  });

  describe('multi-attempt cost calculation', () => {
    it('should handle retry with different costs', () => {
      const tracker = new TokenTracker();
      const attempt1 = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        totalCostUsd: 52.5,
      });
      const attempt2 = makeUsage({
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalCostUsd: 18.0,
      });

      const entry = tracker.addTask('01', [attempt1, attempt2]);
      expect(entry.cost.totalCost).toBe(70.5);
    });

    it('should include all attempt usage in grand totals', () => {
      const tracker = new TokenTracker();

      // Task 1: 2 attempts
      tracker.addTask('01', [
        makeUsage({ inputTokens: 500_000, totalCostUsd: 10.0 }),
        makeUsage({ inputTokens: 500_000, totalCostUsd: 10.0 }),
      ]);

      // Task 2: 1 attempt
      tracker.addTask('02', [
        makeUsage({ inputTokens: 1_000_000, totalCostUsd: 20.0 }),
      ]);

      const totals = tracker.getTotals();
      expect(totals.usage.inputTokens).toBe(2_000_000);
      expect(totals.cost.totalCost).toBe(40.0);
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
        totalCostUsd: 1.5,
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
      expect(result.totalCostUsd).toBe(1.5);
      expect(result.modelUsage['claude-opus-4-6']?.inputTokens).toBe(100);
    });

    it('should sum all token fields across attempts', () => {
      const attempt1 = makeUsage({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadInputTokens: 10,
        cacheCreationInputTokens: 5,
        totalCostUsd: 0.5,
      });
      const attempt2 = makeUsage({
        inputTokens: 200,
        outputTokens: 100,
        cacheReadInputTokens: 20,
        cacheCreationInputTokens: 10,
        totalCostUsd: 1.0,
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
      expect(result.cacheReadInputTokens).toBe(30);
      expect(result.cacheCreationInputTokens).toBe(15);
      expect(result.totalCostUsd).toBe(1.5);
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

    it('should handle zero totalCostUsd in some attempts', () => {
      const attempt1 = makeUsage({
        inputTokens: 100,
        totalCostUsd: 0.5,
      });
      const attempt2 = makeUsage({
        inputTokens: 200,
        totalCostUsd: 0, // explicitly 0
      });

      const result = accumulateUsage([attempt1, attempt2]);
      expect(result.inputTokens).toBe(300);
      expect(result.totalCostUsd).toBe(0.5);
    });
  });

  describe('sumCostBreakdowns', () => {
    it('should return zero breakdown for empty array', () => {
      const result = sumCostBreakdowns([]);
      expect(result.totalCost).toBe(0);
    });

    it('should return same breakdown for single element', () => {
      const cost: CostBreakdown = {
        totalCost: 33,
      };
      const result = sumCostBreakdowns([cost]);
      expect(result).toEqual(cost);
    });

    it('should sum all cost fields across breakdowns', () => {
      const cost1: CostBreakdown = {
        totalCost: 33,
      };
      const cost2: CostBreakdown = {
        totalCost: 16.5,
      };
      const result = sumCostBreakdowns([cost1, cost2]);
      expect(result.totalCost).toBe(49.5);
    });
  });
});
