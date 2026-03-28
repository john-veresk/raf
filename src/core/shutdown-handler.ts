import type { ICliRunner } from './runner-interface.js';
import { logger } from '../utils/logger.js';

type CleanupCallback = () => void | Promise<void>;

class ShutdownHandler {
  private runner: ICliRunner | null = null;
  private cleanupCallbacks: CleanupCallback[] = [];
  private _isShuttingDown = false;

  /** Whether a shutdown has been requested (Ctrl+C / SIGTERM). */
  get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  /**
   * Register a CLI runner to be killed on shutdown.
   */
  registerRunner(runner: ICliRunner): void {
    this.runner = runner;
  }

  /**
   * @deprecated Use registerRunner instead.
   */
  registerClaudeRunner(runner: ICliRunner): void {
    this.registerRunner(runner);
  }

  /**
   * Register a custom cleanup callback.
   */
  onShutdown(callback: CleanupCallback): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Initialize signal handlers.
   */
  init(): void {
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      this.handleShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled rejection: ${reason}`);
      // Don't exit on unhandled rejection, just log
    });
  }

  /**
   * Handle graceful shutdown.
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this._isShuttingDown) {
      // Force exit on second signal
      logger.info('\nForce exiting...');
      process.exit(130);
    }

    this._isShuttingDown = true;
    logger.info(`\nReceived ${signal}, shutting down gracefully...`);

    // Kill runner process if running
    if (this.runner?.isRunning()) {
      logger.debug('Killing runner process...');
      this.runner.kill();
    }

    // Run cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error(`Cleanup callback failed: ${error}`);
      }
    }

    // Reset terminal if needed
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch {
        // Ignore
      }
    }

    process.exit(130);
  }

  /**
   * Clear registrations (useful for testing).
   */
  clear(): void {
    this.runner = null;
    this.cleanupCallbacks = [];
  }
}

export const shutdownHandler = new ShutdownHandler();
