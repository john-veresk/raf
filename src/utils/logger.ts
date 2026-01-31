export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  verbose?: boolean;
  debug?: boolean;
}

class Logger {
  private verbose = false;
  private debugMode = false;

  configure(options: LoggerOptions): void {
    this.verbose = options.verbose ?? false;
    this.debugMode = options.debug ?? false;
  }

  /**
   * @deprecated No longer used - kept for backwards compatibility
   */
  setContext(_prefix: string): void {
    // No-op: context prefix feature removed in favor of minimal output style
  }

  /**
   * @deprecated No longer used - kept for backwards compatibility
   */
  clearContext(): void {
    // No-op: context prefix feature removed in favor of minimal output style
  }

  private formatMessage(message: string): string {
    return message;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage(message), ...args);
  }

  verbose_log(message: string, ...args: unknown[]): void {
    if (this.verbose || this.debugMode) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`⚠️  ${this.formatMessage(message)}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`✗ ${this.formatMessage(message)}`, ...args);
  }

  print(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(`✓ ${this.formatMessage(message)}`, ...args);
  }

  task(status: string, name: string): void {
    console.log(`${status} ${name}`);
  }

  newline(): void {
    console.log();
  }
}

export const logger = new Logger();
