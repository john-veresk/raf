import type { ChildProcess } from 'node:child_process';
import { logger } from './logger.js';

const SIGKILL_GRACE_MS = 15_000;

/**
 * Kill a process group reliably: SIGTERM first, then SIGKILL after a grace period.
 * Requires the process to have been spawned with `detached: true`.
 */
export function killProcessGroup(proc: ChildProcess, reason: string): void {
  const pid = proc.pid;
  if (!pid) return;

  logger.debug(`Sending SIGTERM to process group ${pid} (${reason})`);

  // Try to kill the entire process group
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Process group kill failed, try direct kill
    try {
      proc.kill('SIGTERM');
    } catch {
      // Already dead
      return;
    }
  }

  // Set up SIGKILL escalation
  const sigkillHandle = setTimeout(() => {
    logger.warn(`Process ${pid} did not exit after SIGTERM, sending SIGKILL (${reason})`);
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        proc.kill('SIGKILL');
      } catch {
        // Already dead
      }
    }
  }, SIGKILL_GRACE_MS);

  // Clean up the SIGKILL timer if process exits
  proc.once('close', () => {
    clearTimeout(sigkillHandle);
  });
}
