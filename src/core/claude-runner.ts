import * as fs from 'node:fs';
import * as pty from 'node-pty';
import type { IDisposable } from 'node-pty';
import { execSync, spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { renderStreamEvent } from '../parsers/stream-renderer.js';

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
  /**
   * Skip Claude's permission prompts for file operations.
   * Only used in interactive mode (runInteractive).
   * Claude will still ask planning interview questions.
   */
  dangerouslySkipPermissions?: boolean;
  /**
   * Path to the outcome file. When provided, enables completion detection:
   * - Monitors stdout for completion markers (<promise>COMPLETE/FAILED</promise>)
   * - Polls the outcome file for completion markers
   * When detected, starts a grace period before terminating the process,
   * allowing time for git commit operations to complete.
   */
  outcomeFilePath?: string;
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

const COMPLETION_MARKER_PATTERN = /<promise>(COMPLETE|FAILED)<\/promise>/i;

/**
 * Grace period in ms after completion marker is detected before terminating.
 * Allows time for git commit operations to complete.
 */
export const COMPLETION_GRACE_PERIOD_MS = 60_000;

/**
 * Interval in ms for polling the outcome file for completion markers.
 */
export const OUTCOME_POLL_INTERVAL_MS = 5_000;

/**
 * Monitors for task completion markers in stdout and outcome files.
 * When a marker is detected, starts a grace period before killing the process.
 */
interface CompletionDetector {
  /** Check accumulated stdout output for completion markers. */
  checkOutput(output: string): void;
  /** Clean up all timers. Must be called when the process exits. */
  cleanup(): void;
}

function createCompletionDetector(
  killFn: () => void,
  outcomeFilePath?: string,
): CompletionDetector {
  let graceHandle: ReturnType<typeof setTimeout> | null = null;
  let pollHandle: ReturnType<typeof setInterval> | null = null;
  let initialMtime = 0;

  // Record initial mtime of outcome file to avoid false positives from previous runs
  if (outcomeFilePath) {
    try {
      if (fs.existsSync(outcomeFilePath)) {
        initialMtime = fs.statSync(outcomeFilePath).mtimeMs;
      }
    } catch {
      // Ignore stat errors
    }
  }

  function startGracePeriod(): void {
    if (graceHandle) return; // Already started
    logger.debug('Completion marker detected - starting grace period before termination');
    graceHandle = setTimeout(() => {
      logger.debug('Grace period expired - terminating Claude process');
      killFn();
    }, COMPLETION_GRACE_PERIOD_MS);
  }

  function checkOutput(output: string): void {
    if (!graceHandle && COMPLETION_MARKER_PATTERN.test(output)) {
      startGracePeriod();
    }
  }

  // Start outcome file polling if path provided
  if (outcomeFilePath) {
    const filePath = outcomeFilePath;
    pollHandle = setInterval(() => {
      try {
        if (!fs.existsSync(filePath)) return;
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs <= initialMtime) return; // File unchanged from before execution
        const content = fs.readFileSync(filePath, 'utf-8');
        if (COMPLETION_MARKER_PATTERN.test(content)) {
          startGracePeriod();
        }
      } catch {
        // Ignore read errors - file may be mid-write
      }
    }, OUTCOME_POLL_INTERVAL_MS);
  }

  function cleanup(): void {
    if (graceHandle) clearTimeout(graceHandle);
    if (pollHandle) clearInterval(pollHandle);
  }

  return { checkOutput, cleanup };
}

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
   *
   * @param systemPrompt - Instructions appended to Claude's system prompt via --append-system-prompt
   * @param userMessage - User message passed as positional argument to trigger Claude to start
   * @param options - Runner options (cwd, dangerouslySkipPermissions)
   */
  async runInteractive(
    systemPrompt: string,
    userMessage: string,
    options: ClaudeRunnerOptions = {}
  ): Promise<number> {
    const { cwd = process.cwd(), dangerouslySkipPermissions = false } = options;

    return new Promise((resolve) => {
      const args = ['--model', this.model];

      // Add --dangerously-skip-permissions if requested (for --auto mode)
      if (dangerouslySkipPermissions) {
        args.push('--dangerously-skip-permissions');
      }

      // System instructions via --append-system-prompt
      args.push('--append-system-prompt', systemPrompt);

      // User message as positional argument - Claude starts immediately
      args.push(userMessage);

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

      // Store disposables for proper cleanup
      const disposables: IDisposable[] = [];

      // Pipe output to stdout
      disposables.push(this.activeProcess.onData((data) => {
        process.stdout.write(data);
      }));

      disposables.push(this.activeProcess.onExit(({ exitCode }) => {
        // Cleanup stdin
        process.stdin.off('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();

        // Dispose all event listeners to prevent FD leaks
        for (const disposable of disposables) {
          try {
            disposable.dispose();
          } catch {
            // Ignore disposal errors
          }
        }

        // Ensure PTY is fully cleaned up
        if (this.activeProcess) {
          try {
            this.activeProcess.kill();
          } catch {
            // Ignore - process may already be dead
          }
          this.activeProcess = null;
        }

        if (this.killed) {
          resolve(130); // SIGINT exit code
        } else {
          resolve(exitCode);
        }
      }));
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
    const { timeout = 60, cwd = process.cwd(), outcomeFilePath } = options;
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

      // Use --append-system-prompt to add RAF instructions to system prompt
      // This gives RAF instructions stronger precedence than passing as user message
      // --dangerously-skip-permissions bypasses interactive prompts
      // -p enables print mode (non-interactive)
      const proc = spawn(claudePath, [
        '--dangerously-skip-permissions',
        '--model',
        this.model,
        '--append-system-prompt',
        prompt,
        '-p',
        'Execute the task as described in the system prompt.',
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

      // Set up completion detection (stdout marker + outcome file polling)
      const completionDetector = createCompletionDetector(
        () => proc.kill('SIGTERM'),
        outcomeFilePath,
      );

      // Collect stdout
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Check for completion marker to start grace period
        completionDetector.checkOutput(output);

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
        completionDetector.cleanup();
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
   * Uses --output-format stream-json --verbose to get real-time streaming
   * of tool calls, file operations, and thinking steps.
   *
   * TIMEOUT BEHAVIOR:
   * - The timeout is applied per individual call to this method
   * - Each call gets a fresh timeout - elapsed time is NOT shared between calls
   * - When used with retries (in do.ts), each retry attempt gets its own fresh timeout
   * - Timeout includes all time Claude is running, including context building
   * - Default timeout is 60 minutes if not specified
   */
  async runVerbose(prompt: string, options: ClaudeRunnerOptions = {}): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd(), outcomeFilePath } = options;
    // Ensure timeout is a positive number, fallback to 60 minutes
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;

      const claudePath = getClaudePath();

      logger.debug(`Starting Claude execution session (verbose/stream-json) with model: ${this.model}`);
      logger.debug(`Prompt length: ${prompt.length}, timeout: ${timeoutMs}ms, cwd: ${cwd}`);
      logger.debug(`Claude path: ${claudePath}`);

      logger.debug('Spawning process...');
      // Use --output-format stream-json --verbose to get real-time streaming events
      // including tool calls, file operations, and intermediate output.
      // --dangerously-skip-permissions bypasses interactive prompts
      // -p enables print mode (non-interactive)
      const proc = spawn(claudePath, [
        '--dangerously-skip-permissions',
        '--model',
        this.model,
        '--append-system-prompt',
        prompt,
        '--output-format',
        'stream-json',
        '--verbose',
        '-p',
        'Execute the task as described in the system prompt.',
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

      // Set up completion detection (stdout marker + outcome file polling)
      const completionDetector = createCompletionDetector(
        () => proc.kill('SIGTERM'),
        outcomeFilePath,
      );

      // Buffer for incomplete NDJSON lines (data chunks may split across line boundaries)
      let lineBuffer = '';
      let dataReceived = false;

      proc.stdout.on('data', (data) => {
        if (!dataReceived) {
          logger.debug('First data chunk received');
          dataReceived = true;
        }

        lineBuffer += data.toString();

        // Process complete lines from the NDJSON stream
        let newlineIndex: number;
        while ((newlineIndex = lineBuffer.indexOf('\n')) !== -1) {
          const line = lineBuffer.substring(0, newlineIndex);
          lineBuffer = lineBuffer.substring(newlineIndex + 1);

          const { display, textContent } = renderStreamEvent(line);

          if (textContent) {
            output += textContent;

            // Check for completion marker to start grace period
            completionDetector.checkOutput(output);

            // Check for context overflow
            for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
              if (pattern.test(textContent)) {
                contextOverflow = true;
                logger.warn('Context overflow detected');
                proc.kill('SIGTERM');
                break;
              }
            }
          }

          if (display) {
            process.stdout.write(display);
          }
        }
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        // Process any remaining data in the line buffer
        if (lineBuffer.trim()) {
          const { display, textContent } = renderStreamEvent(lineBuffer);
          if (textContent) {
            output += textContent;
          }
          if (display) {
            process.stdout.write(display);
          }
        }

        clearTimeout(timeoutHandle);
        completionDetector.cleanup();
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
