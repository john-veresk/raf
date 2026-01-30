import * as pty from 'node-pty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { logger } from '../utils/logger.js';

function getClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Claude CLI not found. Please ensure it is installed and in your PATH.');
  }
}

function writeTempPrompt(prompt: string): string {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `raf-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tempFile, prompt);
  return tempFile;
}

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
      // Don't use --print for interactive sessions - it disables interactivity
      const args = [prompt];

      logger.debug('Starting interactive Claude session');

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
   * Passes prompt via stdin using a temp file to avoid shell escaping issues.
   */
  async run(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    const timeoutMs = Number(timeout) * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;
      let contextOverflow = false;

      // Write prompt to temp file
      const tempFile = writeTempPrompt(prompt);
      const claudePath = getClaudePath();

      logger.debug('Starting Claude execution session');
      logger.debug(`Temp file: ${tempFile}`);

      // Spawn bash with -c flag and the full command
      const shellCmd = `"${claudePath}" --print < "${tempFile}"`;
      this.activeProcess = pty.spawn('/bin/bash', ['-c', shellCmd], {
        name: 'dumb', // Use dumb terminal to avoid escape codes
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
        try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
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

        // Clean up temp file
        try { fs.unlinkSync(tempFile); } catch { /* ignore */ }

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
   * Passes prompt via stdin using a temp file to avoid shell escaping issues.
   */
  async runVerbose(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd() } = options;
    const timeoutMs = Number(timeout) * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let timedOut = false;
      let contextOverflow = false;

      // Write prompt to temp file
      const tempFile = writeTempPrompt(prompt);
      const claudePath = getClaudePath();

      logger.debug('Starting Claude execution session (verbose)');
      logger.debug(`Prompt length: ${prompt.length}, timeout: ${timeoutMs}ms, cwd: ${cwd}`);
      logger.debug(`Claude path: ${claudePath}`);
      logger.debug(`Temp file: ${tempFile}`);

      logger.debug('Spawning PTY process...');
      // Spawn bash with -c flag and the full command
      const shellCmd = `"${claudePath}" --print < "${tempFile}"`;
      this.activeProcess = pty.spawn('/bin/bash', ['-c', shellCmd], {
        name: 'dumb', // Use dumb terminal to avoid escape codes
        cols: process.stdout.columns ?? 120,
        rows: process.stdout.rows ?? 40,
        cwd,
        env: process.env as Record<string, string>,
      });
      logger.debug('PTY process spawned');

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Claude session timed out');
        this.kill();
        try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
      }, timeoutMs);

      // Collect and display output
      let dataReceived = false;
      this.activeProcess.onData((data) => {
        if (!dataReceived) {
          logger.debug('First data chunk received');
          dataReceived = true;
        }
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
        logger.debug(`Claude exited with code ${exitCode}, output length: ${output.length}, timedOut: ${timedOut}, contextOverflow: ${contextOverflow}`);

        // Clean up temp file
        try { fs.unlinkSync(tempFile); } catch { /* ignore */ }

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
