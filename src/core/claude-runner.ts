import * as pty from 'node-pty';
import { execSync, spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';

function getClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Claude CLI not found. Please ensure it is installed and in your PATH.');
  }
}

export interface ClaudeRunnerOptions {
  /**
   * Timeout in minutes for this single execution.
   * Default: 60 minutes.
   * Each call to run() or runVerbose() gets its own fresh timeout.
   * Retries get a fresh timeout - elapsed time is NOT accumulated across attempts.
   */
  timeout?: number;
  cwd?: string;
}

export interface ClaudeRunnerConfig {
  /**
   * Claude model to use (sonnet, haiku, opus).
   * Default: opus.
   */
  model?: string;
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
  private model: string;

  constructor(config: ClaudeRunnerConfig = {}) {
    this.model = config.model ?? 'opus';
  }

  /**
   * Run Claude interactively with stdin/stdout passthrough.
   * Used for planning phase where user interaction is needed.
   */
  async runInteractive(prompt: string, options: ClaudeRunnerOptions = {}): Promise<number> {
    const { cwd = process.cwd() } = options;

    return new Promise((resolve) => {
      // Don't use --print for interactive sessions - it disables interactivity
      const args = ['--model', this.model, prompt];

      logger.debug(`Starting interactive Claude session with model: ${this.model}`);

      this.activeProcess = pty.spawn(getClaudePath(), args, {
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
   * Uses child_process.spawn with -p flag for prompt (like ralphy).
   *
   * TIMEOUT BEHAVIOR:
   * - The timeout is applied per individual call to this method
   * - Each call gets a fresh timeout - elapsed time is NOT shared between calls
   * - When used with retries (in do.ts), each retry attempt gets its own fresh timeout
   * - Timeout includes all time Claude is running, including context building
   * - Default timeout is 60 minutes if not specified
   */
  async run(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    // Ensure timeout is a positive number, fallback to 60 minutes
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;

      const claudePath = getClaudePath();

      logger.debug(`Starting Claude execution session with model: ${this.model}`);
      logger.debug(`Claude path: ${claudePath}`);

      // Use -p flag to pass prompt as argument (like ralphy does)
      // --dangerously-skip-permissions bypasses interactive prompts
      const proc = spawn(claudePath, [
        '--dangerously-skip-permissions',
        '--model',
        this.model,
        '-p',
        prompt,
      ], {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'], // no stdin needed
      });

      // Track this process
      this.activeProcess = proc as any;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Claude session timed out');
        proc.kill('SIGTERM');
      }, timeoutMs);

      // Collect stdout
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Check for context overflow
        for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
          if (pattern.test(text)) {
            contextOverflow = true;
            logger.warn('Context overflow detected');
            proc.kill('SIGTERM');
            break;
          }
        }
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);
        this.activeProcess = null;

        if (stderr) {
          logger.debug(`Claude stderr: ${stderr}`);
        }

        resolve({
          output,
          exitCode: exitCode ?? (this.killed ? 130 : 1),
          timedOut,
          contextOverflow,
        });
      });
    });
  }

  /**
   * Run Claude non-interactively with verbose output to stdout.
   * Uses child_process.spawn with -p flag for prompt (like ralphy).
   *
   * TIMEOUT BEHAVIOR:
   * - The timeout is applied per individual call to this method
   * - Each call gets a fresh timeout - elapsed time is NOT shared between calls
   * - When used with retries (in do.ts), each retry attempt gets its own fresh timeout
   * - Timeout includes all time Claude is running, including context building
   * - Default timeout is 60 minutes if not specified
   */
  async runVerbose(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    // Ensure timeout is a positive number, fallback to 60 minutes
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;

      const claudePath = getClaudePath();

      logger.debug(`Starting Claude execution session (verbose) with model: ${this.model}`);
      logger.debug(`Prompt length: ${prompt.length}, timeout: ${timeoutMs}ms, cwd: ${cwd}`);
      logger.debug(`Claude path: ${claudePath}`);

      logger.debug('Spawning process...');
      // Use -p flag to pass prompt as argument (like ralphy does)
      // --dangerously-skip-permissions bypasses interactive prompts
      const proc = spawn(claudePath, [
        '--dangerously-skip-permissions',
        '--model',
        this.model,
        '-p',
        prompt,
      ], {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'], // no stdin needed
      });

      // Track this process
      this.activeProcess = proc as any;
      logger.debug('Process spawned');

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Claude session timed out');
        proc.kill('SIGTERM');
      }, timeoutMs);

      // Collect and display stdout
      let dataReceived = false;
      proc.stdout.on('data', (data) => {
        if (!dataReceived) {
          logger.debug('First data chunk received');
          dataReceived = true;
        }
        const text = data.toString();
        output += text;
        process.stdout.write(text);

        // Check for context overflow
        for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
          if (pattern.test(text)) {
            contextOverflow = true;
            logger.warn('Context overflow detected');
            proc.kill('SIGTERM');
            break;
          }
        }
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);
        this.activeProcess = null;
        logger.debug(`Claude exited with code ${exitCode}, output length: ${output.length}, timedOut: ${timedOut}, contextOverflow: ${contextOverflow}`);

        if (stderr) {
          logger.debug(`Claude stderr: ${stderr}`);
        }

        resolve({
          output,
          exitCode: exitCode ?? (this.killed ? 130 : 1),
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

      // Send Ctrl+C first for graceful shutdown (only for PTY processes)
      // ChildProcess from spawn() doesn't have write(), only PTY does
      try {
        if (typeof this.activeProcess.write === 'function') {
          this.activeProcess.write('\x03');
        }
      } catch {
        // Ignore write errors - process may already be closing
      }

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.activeProcess) {
          try {
            this.activeProcess.kill();
          } catch {
            // Ignore kill errors - process may already be dead
          }
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
