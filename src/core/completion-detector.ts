import * as fs from 'node:fs';
import { logger } from '../utils/logger.js';

/**
 * Grace period in ms after completion marker is detected before terminating.
 * Allows time for git commit operations to complete.
 */
export const COMPLETION_GRACE_PERIOD_MS = 60_000;

/**
 * Interval in ms for polling the outcome file for completion markers.
 */
export const OUTCOME_POLL_INTERVAL_MS = 5_000;

export const COMPLETION_MARKER_PATTERN = /<promise>(COMPLETE|FAILED)<\/promise>/i;

const COMPLETE_MARKER_PATTERN = /<promise>COMPLETE<\/promise>/i;

/**
 * Monitors for task completion markers in stdout and outcome files.
 * When a marker is detected, starts a grace period before killing the process.
 */
export interface CompletionDetector {
  /** Check accumulated stdout output for completion markers. */
  checkOutput(output: string): void;
  /** Clean up all timers. Must be called when the process exits. */
  cleanup(): void;
}

export function createCompletionDetector(
  killFn: () => void,
  outcomeFilePath?: string,
  onOutcomeFileMarker?: (content: string) => void,
): CompletionDetector {
  let graceHandle: ReturnType<typeof setTimeout> | null = null;
  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let initialMtime = 0;
  let fileMarkerCallbackFired = false;

  // Record initial mtime of outcome file to avoid false positives from previous runs
  if (outcomeFilePath) {
    try {
      if (fs.existsSync(outcomeFilePath)) {
        initialMtime = fs.statSync(outcomeFilePath).mtimeMs;
      }
    } catch {
      // Ignore stat errors
    }
  }

  /**
   * Called when the grace period expires.
   */
  function onGracePeriodExpired(): void {
    logger.debug('Grace period expired - terminating process');
    killFn();
  }

  function startGracePeriod(markerOutput: string): void {
    if (graceHandle) return; // Already started
    const markerType = COMPLETE_MARKER_PATTERN.test(markerOutput) ? 'COMPLETE' : 'FAILED';
    logger.debug('Completion marker detected - starting grace period before termination');
    logger.debug(`Detected ${markerType} marker`);
    graceHandle = setTimeout(onGracePeriodExpired, COMPLETION_GRACE_PERIOD_MS);
  }

  function checkOutput(output: string): void {
    if (!graceHandle && COMPLETION_MARKER_PATTERN.test(output)) {
      startGracePeriod(output);
    }
  }

  // Start outcome file polling if path provided
  if (outcomeFilePath) {
    const filePath = outcomeFilePath;
    pollHandle = setInterval(() => {
      try {
        if (!fs.existsSync(filePath)) return;
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs <= initialMtime) return; // File unchanged from before execution
        const content = fs.readFileSync(filePath, 'utf-8');
        if (COMPLETION_MARKER_PATTERN.test(content)) {
          if (!fileMarkerCallbackFired && onOutcomeFileMarker) {
            fileMarkerCallbackFired = true;
            try {
              onOutcomeFileMarker(content);
            } catch (error) {
              logger.debug(`Outcome marker callback failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          startGracePeriod(content);
        }
      } catch {
        // Ignore read errors - file may be mid-write
      }
    }, OUTCOME_POLL_INTERVAL_MS);
  }

  function cleanup(): void {
    if (graceHandle) clearTimeout(graceHandle);
    if (pollHandle) clearInterval(pollHandle);
  }

  return { checkOutput, cleanup };
}
