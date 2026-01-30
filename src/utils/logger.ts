export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  verbose?: boolean;
  debug?: boolean;
}

class Logger {
  private verbose = false;
  private debugMode = false;
  private contextPrefix = '';

  configure(options: LoggerOptions): void {
    this.verbose = options.verbose ?? false;
    this.debugMode = options.debug ?? false;
  }

  setContext(prefix: string): void {
    this.contextPrefix = prefix;
  }

  clearContext(): void {
    this.contextPrefix = '';
  }

  private formatMessage(message: string): string {
    if (this.contextPrefix) {
      return `${this.contextPrefix} ${message}`;
    }
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
    console.error(`Error: ${this.formatMessage(message)}`, ...args);
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
