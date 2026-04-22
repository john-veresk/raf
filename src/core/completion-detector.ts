import * as fs from 'node:fs';
import { logger } from '../utils/logger.js';
import { getHeadCommitHash, getHeadCommitMessage, isFileCommittedInHead } from './git.js';

/**
 * Grace period in ms after completion marker is detected before terminating.
 * Allows time for git commit operations to complete.
 */
export const COMPLETION_GRACE_PERIOD_MS = 60_000;

/**
 * Hard maximum grace period in ms. If the commit hasn't landed by this point,
 * the process is killed regardless.
 */
export const COMPLETION_HARD_MAX_MS = 180_000;

/**
 * Interval in ms for polling commit verification after the initial grace period expires.
 */
export const COMMIT_POLL_INTERVAL_MS = 10_000;

/**
 * Interval in ms for polling the outcome file for completion markers.
 */
export const OUTCOME_POLL_INTERVAL_MS = 5_000;

export const COMPLETION_MARKER_PATTERN = /<promise>(COMPLETE|FAILED)<\/promise>/i;

const COMPLETE_MARKER_PATTERN = /<promise>COMPLETE<\/promise>/i;

/**
 * Context for commit verification during grace period.
 */
export interface CommitContext {
  /** HEAD commit hash recorded before task execution began. */
  preExecutionHead: string;
  /** Expected commit message prefix (e.g., "RAF[005:01]"). */
  expectedPrefix: string;
  /** Path to the outcome file that should be committed. */
  outcomeFilePath: string;
}

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

/**
 * Verify that the expected commit has been made.
 * Checks: HEAD changed, commit message matches prefix, outcome file is committed.
 */
export function verifyCommit(commitContext: CommitContext): boolean {
  const currentHead = getHeadCommitHash();
  if (!currentHead || currentHead === commitContext.preExecutionHead) {
    return false;
  }

  const message = getHeadCommitMessage();
  if (!message || !message.startsWith(commitContext.expectedPrefix)) {
    return false;
  }

  if (!isFileCommittedInHead(commitContext.outcomeFilePath)) {
    return false;
  }

  return true;
}

export function createCompletionDetector(
  killFn: () => void,
  outcomeFilePath?: string,
  commitContext?: CommitContext,
  onOutcomeFileMarker?: (content: string) => void,
): CompletionDetector {
  let graceHandle: ReturnType<typeof setTimeout> | null = null;
  let commitPollHandle: ReturnType<typeof setInterval> | null = null;
  let hardMaxHandle: ReturnType<typeof setTimeout> | null = null;
  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let initialMtime = 0;
  let detectedMarkerIsComplete = false;
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
   * Called when the initial grace period expires.
   * If commit verification is needed and the commit hasn't landed yet,
   * start polling for the commit up to the hard maximum.
   */
  function onGracePeriodExpired(): void {
    if (commitContext && detectedMarkerIsComplete) {
      // Check if commit already landed
      if (verifyCommit(commitContext)) {
        logger.debug('Grace period expired - commit verified, terminating process');
        killFn();
        return;
      }

      // Commit not found yet - extend with polling
      logger.debug('Grace period expired but commit not verified - extending with polling');
      const remainingMs = COMPLETION_HARD_MAX_MS - COMPLETION_GRACE_PERIOD_MS;

      hardMaxHandle = setTimeout(() => {
        logger.warn('Hard maximum grace period reached without commit verification - terminating process');
        if (commitPollHandle) clearInterval(commitPollHandle);
        killFn();
      }, remainingMs);

      commitPollHandle = setInterval(() => {
        if (commitContext && verifyCommit(commitContext)) {
          logger.debug('Commit verified during extended grace period - terminating process');
          if (commitPollHandle) clearInterval(commitPollHandle);
          if (hardMaxHandle) clearTimeout(hardMaxHandle);
          killFn();
        }
      }, COMMIT_POLL_INTERVAL_MS);
    } else {
      // No commit verification needed (FAILED marker or no context) - kill immediately
      logger.debug('Grace period expired - terminating process');
      killFn();
    }
  }

  function startGracePeriod(markerOutput: string): void {
    if (graceHandle) return; // Already started
    detectedMarkerIsComplete = COMPLETE_MARKER_PATTERN.test(markerOutput);
    logger.debug('Completion marker detected - starting grace period before termination');
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
    if (commitPollHandle) clearInterval(commitPollHandle);
    if (hardMaxHandle) clearTimeout(hardMaxHandle);
  }

  return { checkOutput, cleanup };
}
