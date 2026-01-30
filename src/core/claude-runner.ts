import * as pty from 'node-pty';
import { logger } from '../utils/logger.js';

export interface ClaudeRunnerOptions {
  timeout?: number; // in minutes
  cwd?: string;
}

export interface RunResult {
  output: string;
  exitCode: number;
  timedOut: boolean;
  contextOverflow: boolean;
}

const CONTEXT_OVERFLOW_PATTERNS = [
  /context length exceeded/i,
  /token limit/i,
  /maximum context/i,
  /context window/i,
];

export class ClaudeRunner {
  private activeProcess: pty.IPty | null = null;
  private killed = false;

  /**
   * Run Claude interactively with stdin/stdout passthrough.
   * Used for planning phase where user interaction is needed.
   */
  async runInteractive(prompt: string, options: ClaudeRunnerOptions = {}): Promise<number> {
    const { cwd = process.cwd() } = options;

    return new Promise((resolve) => {
      const args = ['--print', prompt];

      logger.debug('Starting interactive Claude session');

      this.activeProcess = pty.spawn('claude', args, {
        name: 'xterm-256color',
        cols: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
        cwd,
        env: process.env as Record<string, string>,
      });

      // Set raw mode to pass through all input
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      // Pipe input to Claude
      const onData = (data: Buffer): void => {
        if (this.activeProcess && !this.killed) {
          this.activeProcess.write(data.toString());
        }
      };
      process.stdin.on('data', onData);

      // Pipe output to stdout
      this.activeProcess.onData((data) => {
        process.stdout.write(data);
      });

      this.activeProcess.onExit(({ exitCode }) => {
        // Cleanup
        process.stdin.off('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        this.activeProcess = null;

        if (this.killed) {
          resolve(130); // SIGINT exit code
        } else {
          resolve(exitCode);
        }
      });
    });
  }

  /**
   * Run Claude non-interactively and collect output.
   * Used for execution phase where we parse the results.
   */
  async run(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    const timeoutMs = timeout * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;
      let contextOverflow = false;

      const args = ['--print', prompt];

      logger.debug('Starting Claude execution session');

      this.activeProcess = pty.spawn('claude', args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd,
        env: process.env as Record<string, string>,
      });

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Claude session timed out');
        this.kill();
      }, timeoutMs);

      // Collect output
      this.activeProcess.onData((data) => {
        output += data;

        // Check for context overflow
        for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
          if (pattern.test(data)) {
            contextOverflow = true;
            logger.warn('Context overflow detected');
            this.kill();
            break;
          }
        }
      });

      this.activeProcess.onExit(({ exitCode }) => {
        clearTimeout(timeoutHandle);
        this.activeProcess = null;

        resolve({
          output,
          exitCode: this.killed ? 130 : exitCode,
          timedOut,
          contextOverflow,
        });
      });
    });
  }

  /**
   * Run Claude non-interactively with verbose output to stdout.
   */
  async runVerbose(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    const timeoutMs = timeout * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;
      let contextOverflow = false;

      const args = ['--print', prompt];

      logger.debug('Starting Claude execution session (verbose)');

      this.activeProcess = pty.spawn('claude', args, {
        name: 'xterm-256color',
        cols: process.stdout.columns ?? 120,
        rows: process.stdout.rows ?? 40,
        cwd,
        env: process.env as Record<string, string>,
      });

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Claude session timed out');
        this.kill();
      }, timeoutMs);

      // Collect and display output
      this.activeProcess.onData((data) => {
        output += data;
        process.stdout.write(data);

        // Check for context overflow
        for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
          if (pattern.test(data)) {
            contextOverflow = true;
            logger.warn('Context overflow detected');
            this.kill();
            break;
          }
        }
      });

      this.activeProcess.onExit(({ exitCode }) => {
        clearTimeout(timeoutHandle);
        this.activeProcess = null;

        resolve({
          output,
          exitCode: this.killed ? 130 : exitCode,
          timedOut,
          contextOverflow,
        });
      });
    });
  }

  /**
   * Kill the active Claude process gracefully.
   */
  kill(): void {
    if (this.activeProcess) {
      this.killed = true;
      // Send Ctrl+C first for graceful shutdown
      this.activeProcess.write('\x03');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.activeProcess) {
          this.activeProcess.kill();
        }
      }, 5000);
    }
  }

  /**
   * Check if a process is currently running.
   */
  isRunning(): boolean {
    return this.activeProcess !== null;
  }
}
