/**
 * Runtime verbose toggle for task execution.
 *
 * Listens for Tab keypress on process.stdin to toggle verbose display on/off.
 * When verbose is on, tool-use activity lines from stream-json are displayed.
 * When verbose is off, they are suppressed (but data is still captured).
 *
 * Requires a TTY stdin. Silently skips setup when stdin is not a TTY (e.g., piped input).
 */

import { logger } from './logger.js';

export class VerboseToggle {
  private _verbose: boolean;
  private _active = false;
  private _dataHandler: ((data: Buffer) => void) | null = null;

  constructor(initialVerbose: boolean) {
    this._verbose = initialVerbose;
  }

  /** Current verbose display state. */
  get isVerbose(): boolean {
    return this._verbose;
  }

  /** Whether the toggle listener is currently active. */
  get isActive(): boolean {
    return this._active;
  }

  /**
   * Start listening for Tab keypress on stdin.
   * Sets stdin to raw mode to capture individual keypresses.
   * Shows a hint message about the toggle.
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
        } else if (byte === 0x03) {
          // Ctrl+C — re-emit SIGINT so the shutdown handler catches it
          process.emit('SIGINT');
        }
      }
    };

    process.stdin.on('data', this._dataHandler);
    this._active = true;

    // Show toggle hint
    logger.dim('  Press Tab to toggle verbose mode');
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
  }
}
