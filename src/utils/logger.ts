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

  debug(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  verbose_log(message: string, ...args: unknown[]): void {
    if (this.verbose || this.debugMode) {
      console.log(message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`⚠️  ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`Error: ${message}`, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(`✓ ${message}`, ...args);
  }

  task(status: string, name: string): void {
    console.log(`${status} ${name}`);
  }

  newline(): void {
    console.log();
  }
}

export const logger = new Logger();
