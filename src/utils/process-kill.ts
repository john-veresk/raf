import type { ChildProcess } from 'node:child_process';
import { logger } from './logger.js';

const SIGKILL_GRACE_MS = 15_000;

/**
 * Kill a process group reliably: SIGTERM first, then SIGKILL after a grace period.
 * Requires the process to have been spawned with `detached: true`.
 */
export function killProcessGroup(proc: ChildProcess, reason: string): void {
  const pid = proc.pid;
  let terminated = false;

  if (pid) {
    logger.debug(`Sending SIGTERM to process group ${pid} (${reason})`);

    try {
      process.kill(-pid, 'SIGTERM');
      terminated = true;
    } catch {
      // Fall back to direct kill below.
    }
  }

  if (!terminated) {
    try {
      proc.kill('SIGTERM');
      terminated = true;
    } catch {
      return;
    }
  }

  // Set up SIGKILL escalation
  const sigkillHandle = setTimeout(() => {
    logger.warn(`Process ${pid} did not exit after SIGTERM, sending SIGKILL (${reason})`);
    if (pid) {
      try {
        process.kill(-pid, 'SIGKILL');
        return;
      } catch {
        // Fall back to direct kill below.
      }
    }

    try {
      proc.kill('SIGKILL');
    } catch {
      // Already dead
    }
  }, SIGKILL_GRACE_MS);

  // Clean up the SIGKILL timer if process exits
  proc.once('close', () => {
    clearTimeout(sigkillHandle);
  });
}
