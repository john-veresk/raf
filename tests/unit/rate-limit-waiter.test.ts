import { jest } from '@jest/globals';
import { waitForRateLimit } from '../../src/core/rate-limit-waiter.js';
import { logger } from '../../src/utils/logger.js';

function formatResetTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  }).format(date);
}

describe('waitForRateLimit', () => {
  let infoSpy: jest.SpiedFunction<typeof logger.info>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-18T10:00:00.000Z'));
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('logs and waits until the exact provider reset timestamp', async () => {
    const resetsAt = new Date(Date.now() + 5_000);
    let settled = false;

    const waitPromise = waitForRateLimit({
      resetsAt,
      limitType: 'usage_limit_reached',
      shouldAbort: () => false,
      isPaused: () => false,
      waitForResume: async () => undefined,
    }).then(result => {
      settled = true;
      return result;
    });

    expect(infoSpy).toHaveBeenCalledWith(
      `  \u23f3 Rate limit hit (usage_limit_reached). Waiting until ${formatResetTime(resetsAt)}...`,
    );

    await jest.advanceTimersByTimeAsync(4_000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1_000);
    await expect(waitPromise).resolves.toEqual({ completed: true, waitedMs: 5_000 });
  });

  it('uses the fallback wait duration only when no reset timestamp is known', async () => {
    const fallbackWaitMs = 60_000;
    const expectedReset = new Date(Date.now() + fallbackWaitMs);
    let settled = false;

    const waitPromise = waitForRateLimit({
      fallbackWaitMs,
      limitType: 'unknown',
      shouldAbort: () => false,
      isPaused: () => false,
      waitForResume: async () => undefined,
    }).then(result => {
      settled = true;
      return result;
    });

    expect(infoSpy).toHaveBeenCalledWith(
      `  \u23f3 Rate limit hit (unknown). Waiting until ${formatResetTime(expectedReset)}...`,
    );

    await jest.advanceTimersByTimeAsync(59_000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1_000);
    await expect(waitPromise).resolves.toEqual({ completed: true, waitedMs: 60_000 });
  });

  it('keeps pause/resume working without shifting a known provider reset timestamp', async () => {
    const resetsAt = new Date(Date.now() + 5_000);
    let paused = false;
    let resumeWait!: () => void;

    const waitPromise = waitForRateLimit({
      resetsAt,
      limitType: 'usage_limit_reached',
      shouldAbort: () => false,
      isPaused: () => paused,
      waitForResume: () => new Promise(resolve => {
        resumeWait = resolve;
      }),
    });

    await jest.advanceTimersByTimeAsync(2_000);
    paused = true;
    await jest.advanceTimersByTimeAsync(1_000);

    expect(infoSpy).toHaveBeenNthCalledWith(
      1,
      `  \u23f3 Rate limit hit (usage_limit_reached). Waiting until ${formatResetTime(resetsAt)}...`,
    );

    await jest.advanceTimersByTimeAsync(5_000);
    paused = false;
    resumeWait();

    await expect(waitPromise).resolves.toEqual({ completed: true, waitedMs: 8_000 });
    expect(infoSpy).toHaveBeenNthCalledWith(
      2,
      `  \u23f3 Resuming rate limit wait. Waiting until ${formatResetTime(resetsAt)}...`,
    );
  });

  it('supports aborting while waiting', async () => {
    let aborted = false;

    const waitPromise = waitForRateLimit({
      fallbackWaitMs: 60_000,
      limitType: 'unknown',
      shouldAbort: () => aborted,
      isPaused: () => false,
      waitForResume: async () => undefined,
    });

    await jest.advanceTimersByTimeAsync(2_000);
    aborted = true;
    await jest.advanceTimersByTimeAsync(1_000);

    await expect(waitPromise).resolves.toEqual({ completed: false, waitedMs: 3_000 });
  });
});
