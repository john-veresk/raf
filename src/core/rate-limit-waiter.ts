import { logger } from '../utils/logger.js';

export interface RateLimitWaitOptions {
  resetsAt: Date;
  limitType: string;
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

/** Safety buffer added after the reset time (API may not be ready instantly). */
const SAFETY_BUFFER_MS = 30_000;
/** If the reset time is less than this far away, add an extra buffer. */
const MIN_DURATION_THRESHOLD_MS = 10_000;
/** Extra buffer added when reset time is very close or in the past. */
const NEAR_RESET_BUFFER_MS = 60_000;

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
  const { resetsAt, limitType, shouldAbort, isPaused, waitForResume } = options;
  const startTime = Date.now();

  // Calculate raw wait duration
  let rawDuration = resetsAt.getTime() - Date.now();

  // If reset time is very close or in the past, add extra buffer
  if (rawDuration < MIN_DURATION_THRESHOLD_MS) {
    rawDuration += NEAR_RESET_BUFFER_MS;
  }

  // Always add safety buffer
  rawDuration += SAFETY_BUFFER_MS;

  const resetTimeDisplay = formatResetTime(new Date(resetsAt.getTime() + SAFETY_BUFFER_MS));
  logger.info(`  \u23f3 Rate limit hit (${limitType}). Waiting until ${resetTimeDisplay}...`);

  let remaining = rawDuration;

  while (remaining > 0) {
    if (shouldAbort()) {
      return { completed: false, waitedMs: Date.now() - startTime };
    }

    // Handle pause: stop the clock, wait for resume, then continue with remaining time
    if (isPaused()) {
      await waitForResume();
      // Pause time doesn't count against the wait — log updated ETA
      const newResetDisplay = formatResetTime(new Date(Date.now() + remaining));
      logger.info(`  \u23f3 Resuming rate limit wait. Waiting until ${newResetDisplay}...`);
      continue;
    }

    // Sleep in 1s chunks so we can check abort/pause
    const sleepMs = Math.min(remaining, 1000);
    await new Promise(resolve => setTimeout(resolve, sleepMs));
    remaining -= sleepMs;
  }

  return { completed: true, waitedMs: Date.now() - startTime };
}
