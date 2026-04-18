import { logger } from '../utils/logger.js';

export interface RateLimitWaitOptions {
  limitType: string;
  resetsAt?: Date;
  fallbackWaitMs?: number;
  /** If true, abort the wait immediately */
  shouldAbort: () => boolean;
  /** If true, pause was requested — caller should handle pause flow */
  isPaused: () => boolean;
  /** Called when pause is detected; should resolve when user resumes */
  waitForResume: () => Promise<void>;
}

export interface RateLimitWaitResult {
  /** true if waited until reset, false if aborted */
  completed: boolean;
  waitedMs: number;
}

/**
 * Format the reset time for display: "HH:MM TZ".
 */
function formatResetTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  }).format(date);
}

/**
 * Wait until a rate limit resets. Logs a static message and sleeps.
 *
 * Supports abort (Ctrl+C) and pause (P key) during the wait.
 */
export async function waitForRateLimit(options: RateLimitWaitOptions): Promise<RateLimitWaitResult> {
  const { resetsAt, fallbackWaitMs, limitType, shouldAbort, isPaused, waitForResume } = options;
  const startTime = Date.now();

  if (!resetsAt && fallbackWaitMs === undefined) {
    throw new Error('waitForRateLimit requires either resetsAt or fallbackWaitMs');
  }

  const targetEndTimeFromStart = resetsAt ? resetsAt.getTime() : Date.now() + fallbackWaitMs!;
  const shouldExtendForPause = !resetsAt;
  const resetTimeDisplay = formatResetTime(new Date(targetEndTimeFromStart));
  logger.info(`  \u23f3 Rate limit hit (${limitType}). Waiting until ${resetTimeDisplay}...`);

  let targetEndTime = targetEndTimeFromStart;

  while (Date.now() < targetEndTime) {
    if (shouldAbort()) {
      return { completed: false, waitedMs: Date.now() - startTime };
    }

    // Handle pause: extend target by pause duration so pause time doesn't count
    if (isPaused()) {
      const pauseStart = Date.now();
      await waitForResume();
      if (shouldExtendForPause) {
        targetEndTime += Date.now() - pauseStart;
      }
      const newResetDisplay = formatResetTime(new Date(targetEndTime));
      logger.info(`  \u23f3 Resuming rate limit wait. Waiting until ${newResetDisplay}...`);
      continue;
    }

    // Sleep in 1s chunks so we can check abort/pause
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { completed: true, waitedMs: Date.now() - startTime };
}
