import { logger } from '../utils/logger.js';

export interface RateLimitWaitOptions {
  resetsAt: Date;
  limitType: string;
  /** Callback checked each second — if true, abort the wait */
  shouldAbort: () => boolean;
  /** Status line writer for countdown display */
  onTick?: (message: string) => void;
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
 * Format milliseconds as a human-readable duration: "Xh Ym Zs".
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
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
 * Wait until a rate limit resets, showing a live countdown.
 *
 * Returns when the wait completes or is aborted (Ctrl+C).
 */
export function waitForRateLimit(options: RateLimitWaitOptions): Promise<RateLimitWaitResult> {
  const { resetsAt, limitType, shouldAbort, onTick } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();

    // Calculate raw wait duration
    let rawDuration = resetsAt.getTime() - Date.now();

    // If reset time is very close or in the past, add extra buffer
    if (rawDuration < MIN_DURATION_THRESHOLD_MS) {
      rawDuration += NEAR_RESET_BUFFER_MS;
    }

    // Always add safety buffer
    rawDuration += SAFETY_BUFFER_MS;

    const targetTime = Date.now() + rawDuration;
    const resetTimeDisplay = formatResetTime(new Date(resetsAt.getTime() + SAFETY_BUFFER_MS));

    logger.info(`  \u23f3 Rate limit hit (${limitType}). Waiting until ${resetTimeDisplay}...`);

    const tick = () => {
      if (shouldAbort()) {
        clearInterval(intervalId);
        resolve({ completed: false, waitedMs: Date.now() - startTime });
        return;
      }

      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        clearInterval(intervalId);
        onTick?.('');
        resolve({ completed: true, waitedMs: Date.now() - startTime });
        return;
      }

      const message = `\u23f3 Rate limit hit (${limitType}). Resuming in ${formatDuration(remaining)} (resets ${resetTimeDisplay})`;
      onTick?.(message);
    };

    // Tick immediately, then every second
    tick();
    const intervalId = setInterval(tick, 1000);
  });
}
