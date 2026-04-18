/**
 * Keyboard controller for task execution.
 *
 * Listens for keypresses on process.stdin:
 * - Tab: toggle verbose display on/off
 * - P: pause/resume execution
 * - C: toggle graceful stop at the next safe boundary
 * - Ctrl+C: SIGINT
 *
 * Requires a TTY stdin. Silently skips setup when stdin is not a TTY (e.g., piped input).
 */

import { logger } from './logger.js';

export class KeyboardController {
  private _verbose: boolean;
  private _paused = false;
  private _cancelled = false;
  private _active = false;
  private _dataHandler: ((data: Buffer) => void) | null = null;
  private _resumeResolvers: Array<() => void> = [];

  constructor(initialVerbose: boolean) {
    this._verbose = initialVerbose;
  }

  /** Current verbose display state. */
  get isVerbose(): boolean {
    return this._verbose;
  }

  /** Whether execution is paused. */
  get isPaused(): boolean {
    return this._paused;
  }

  /** Whether graceful stop has been requested. */
  get isCancelled(): boolean {
    return this._cancelled;
  }

  /** Whether the keyboard listener is currently active. */
  get isActive(): boolean {
    return this._active;
  }

  /**
   * Returns a promise that resolves immediately if not paused,
   * or waits until unpaused. Also resolves if stop() is called.
   */
  waitForResume(): Promise<void> {
    if (!this._paused) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this._resumeResolvers.push(resolve);
    });
  }

  /**
   * Start listening for keypresses on stdin.
   * Sets stdin to raw mode to capture individual keypresses.
   * Shows a hint message about available hotkeys.
   *
   * No-op if stdin is not a TTY or if already active.
   */
  start(): void {
    if (this._active) return;
    if (!process.stdin.isTTY) return;

    try {
      process.stdin.setRawMode(true);
    } catch {
      // Cannot set raw mode — skip
      return;
    }

    process.stdin.resume();

    this._dataHandler = (data: Buffer) => {
      for (let i = 0; i < data.length; i++) {
        const byte = data[i];

        if (byte === 0x09) {
          // Tab key
          this._verbose = !this._verbose;
          const state = this._verbose ? 'on' : 'off';
          logger.dim(`  [verbose: ${state}]`);
        } else if (byte === 0x70 || byte === 0x50) {
          // 'p' or 'P'
          this._paused = !this._paused;
          if (this._paused) {
            logger.dim('  [paused]');
          } else {
            logger.dim('  [resumed]');
            this._flushResumeResolvers();
          }
        } else if (byte === 0x63 || byte === 0x43) {
          // 'c' or 'C'
          this._cancelled = !this._cancelled;
          if (this._cancelled) {
            logger.dim('  [stopping after current task...]');
          } else {
            logger.dim('  [pending stop cleared]');
          }
        } else if (byte === 0x03) {
          // Ctrl+C — re-emit SIGINT so the shutdown handler catches it
          process.emit('SIGINT');
        }
      }
    };

    process.stdin.on('data', this._dataHandler);
    this._active = true;

    // Show hotkeys hint
    logger.dim('  Hotkeys: Tab = verbose, P = pause, C = toggle stop');
  }

  /**
   * Stop listening and restore stdin to normal mode.
   * Safe to call multiple times.
   */
  stop(): void {
    if (!this._active) return;

    if (this._dataHandler) {
      process.stdin.off('data', this._dataHandler);
      this._dataHandler = null;
    }

    try {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    } catch {
      // Ignore — stdin may already be closed
    }

    try {
      process.stdin.pause();
    } catch {
      // Ignore
    }

    this._active = false;

    // Resolve any pending waitForResume promises so they don't hang
    this._flushResumeResolvers();
  }

  private _flushResumeResolvers(): void {
    const resolvers = this._resumeResolvers;
    this._resumeResolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
}
