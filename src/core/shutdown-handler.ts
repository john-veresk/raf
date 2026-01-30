import { ClaudeRunner } from './claude-runner.js';
import { logger } from '../utils/logger.js';

type CleanupCallback = () => void | Promise<void>;

class ShutdownHandler {
  private claudeRunner: ClaudeRunner | null = null;
  private cleanupCallbacks: CleanupCallback[] = [];
  private isShuttingDown = false;

  /**
   * Register a Claude runner to be killed on shutdown.
   */
  registerClaudeRunner(runner: ClaudeRunner): void {
    this.claudeRunner = runner;
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
    if (this.isShuttingDown) {
      // Force exit on second signal
      logger.info('\nForce exiting...');
      process.exit(130);
    }

    this.isShuttingDown = true;
    logger.info(`\nReceived ${signal}, shutting down gracefully...`);

    // Kill Claude process if running
    if (this.claudeRunner?.isRunning()) {
      logger.debug('Killing Claude process...');
      this.claudeRunner.kill();
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
    this.claudeRunner = null;
    this.cleanupCallbacks = [];
  }
}

export const shutdownHandler = new ShutdownHandler();
