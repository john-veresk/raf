import * as pty from 'node-pty';
import type { IDisposable } from 'node-pty';
import { execSync, spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { renderStreamEvent } from '../parsers/stream-renderer.js';
import { getModel } from '../utils/config.js';
import type { ICliRunner } from './runner-interface.js';
import type { RunnerOptions, RunnerConfig, RunResult } from './runner-types.js';
import { createCompletionDetector } from './completion-detector.js';

// Re-export shared types for backward compatibility
export type { RunnerOptions as ClaudeRunnerOptions, RunnerConfig as ClaudeRunnerConfig, RunResult } from './runner-types.js';
export { COMPLETION_GRACE_PERIOD_MS, COMPLETION_HARD_MAX_MS, COMMIT_POLL_INTERVAL_MS, OUTCOME_POLL_INTERVAL_MS } from './completion-detector.js';
export type { CommitContext, CompletionDetector } from './completion-detector.js';

function getClaudePath(): string {
  try {
    return execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Claude CLI not found. Please ensure it is installed and in your PATH.');
  }
}

const CONTEXT_OVERFLOW_PATTERNS = [
  /context length exceeded/i,
  /token limit/i,
  /maximum context/i,
  /context window/i,
];

export class ClaudeRunner implements ICliRunner {
  private activeProcess: pty.IPty | null = null;
  private killed = false;
  private model: string;
  private reasoningEffort?: string;
  private fast?: boolean;

  constructor(config: RunnerConfig = {}) {
    this.model = config.model ?? getModel('execute').model;
    this.reasoningEffort = config.reasoningEffort;
    this.fast = config.fast;
  }

  /**
   * Run interactively with stdin/stdout passthrough.
   * Used for planning phase where user interaction is needed.
   *
   * @param systemPrompt - Instructions appended to the system prompt via --append-system-prompt
   * @param userMessage - User message passed as positional argument to trigger the session
   * @param options - Runner options (cwd, dangerouslySkipPermissions)
   */
  async runInteractive(
    systemPrompt: string,
    userMessage: string,
    options: RunnerOptions = {}
  ): Promise<number> {
    const { cwd = process.cwd(), dangerouslySkipPermissions = false } = options;

    return new Promise((resolve) => {
      const args = ['--model', this.model];

      // Add reasoning effort flag when configured
      if (this.reasoningEffort) {
        args.push('--effort', this.reasoningEffort);
      }

      // Add fast mode when configured
      if (this.fast) {
        args.push('--settings', '{"fastMode": true}');
      }

      // Add --dangerously-skip-permissions if requested (for --auto mode)
      if (dangerouslySkipPermissions) {
        args.push('--dangerously-skip-permissions');
      }

      // System instructions via --append-system-prompt
      args.push('--append-system-prompt', systemPrompt);

      // User message as positional argument - session starts immediately
      args.push(userMessage);

      logger.debug(`Starting interactive session with model: ${this.model}`);

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

      // Pipe input to process
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
   * Resume a planning session using the interactive session picker.
   * Launches `claude --resume` to show available sessions for the CWD.
   * Minimal approach - no system prompt or user message injection.
   *
   * @param options - Runner options (cwd)
   */
  async runResume(options: RunnerOptions = {}): Promise<number> {
    const { cwd = process.cwd() } = options;

    return new Promise((resolve) => {
      const args = ['--resume', '--model', this.model];

      // Add reasoning effort flag when configured
      if (this.reasoningEffort) {
        args.push('--effort', this.reasoningEffort);
      }

      // Add fast mode when configured
      if (this.fast) {
        args.push('--settings', '{"fastMode": true}');
      }

      logger.debug(`Starting session resume picker with model: ${this.model}`);

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

      // Pipe input to process
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
   * Run non-interactively and collect output.
   * Uses stream-json format internally to capture token usage data.
   * Tool display is suppressed (non-verbose mode).
   */
  async run(prompt: string, options: RunnerOptions = {}): Promise<RunResult> {
    return this._runStreamJson(prompt, options, false);
  }

  /**
   * Run non-interactively with verbose output to stdout.
   * Uses --output-format stream-json --verbose to get real-time streaming
   * of tool calls, file operations, and thinking steps.
   */
  async runVerbose(prompt: string, options: RunnerOptions = {}): Promise<RunResult> {
    return this._runStreamJson(prompt, options, true);
  }

  /**
   * Internal unified execution method using stream-json format.
   * Both run() and runVerbose() delegate to this method.
   *
   * @param verbose - When true, tool descriptions and text are printed to stdout.
   *                  When false, display output is suppressed but usage data is still captured.
   */
  private async _runStreamJson(
    prompt: string,
    options: RunnerOptions,
    verbose: boolean,
  ): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd(), outcomeFilePath, commitContext, verboseCheck } = options;
    // Ensure timeout is a positive number, fallback to 60 minutes
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    // When verboseCheck callback is provided, use it to dynamically determine display.
    // Otherwise, fall back to the static verbose parameter.
    const shouldDisplay = verboseCheck ?? (() => verbose);

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;
      let usageData: import('../types/config.js').UsageData | undefined;

      const claudePath = getClaudePath();

      logger.debug(`Starting execution session (stream-json, verbose=${verbose}) with model: ${this.model}`);
      logger.debug(`Prompt length: ${prompt.length}, timeout: ${timeoutMs}ms, cwd: ${cwd}`);
      logger.debug(`CLI path: ${claudePath}`);

      logger.debug('Spawning process...');
      // Use --output-format stream-json --verbose to get real-time streaming events
      // including tool calls, file operations, and token usage in the result event.
      // --dangerously-skip-permissions bypasses interactive prompts
      // -p enables print mode (non-interactive)
      const execArgs = [
        '--dangerously-skip-permissions',
        '--model',
        this.model,
      ];

      // Add reasoning effort flag when configured
      if (this.reasoningEffort) {
        execArgs.push('--effort', this.reasoningEffort);
      }

      // Add fast mode when configured
      if (this.fast) {
        execArgs.push('--settings', '{"fastMode": true}');
      }

      execArgs.push(
        '--append-system-prompt',
        prompt,
        '--output-format',
        'stream-json',
        '--verbose',
        '-p',
        'Execute the task as described in the system prompt.',
      );

      const proc = spawn(claudePath, execArgs, {
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
        logger.warn('Session timed out');
        proc.kill('SIGTERM');
      }, timeoutMs);

      // Set up completion detection (stdout marker + outcome file polling)
      const completionDetector = createCompletionDetector(
        () => proc.kill('SIGTERM'),
        outcomeFilePath,
        commitContext,
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

          const rendered = renderStreamEvent(line);

          if (rendered.textContent) {
            output += rendered.textContent;

            // Check for completion marker to start grace period
            completionDetector.checkOutput(output);

            // Check for context overflow
            for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
              if (pattern.test(rendered.textContent)) {
                contextOverflow = true;
                logger.warn('Context overflow detected');
                proc.kill('SIGTERM');
                break;
              }
            }
          }

          // Capture usage data from result events
          if (rendered.usageData) {
            usageData = rendered.usageData;
          }

          if (shouldDisplay() && rendered.display) {
            process.stdout.write(rendered.display);
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
          const rendered = renderStreamEvent(lineBuffer);
          if (rendered.textContent) {
            output += rendered.textContent;
          }
          if (rendered.usageData) {
            usageData = rendered.usageData;
          }
          if (shouldDisplay() && rendered.display) {
            process.stdout.write(rendered.display);
          }
        }

        clearTimeout(timeoutHandle);
        completionDetector.cleanup();
        this.activeProcess = null;
        logger.debug(`Process exited with code ${exitCode}, output length: ${output.length}, timedOut: ${timedOut}, contextOverflow: ${contextOverflow}`);

        if (stderr) {
          logger.debug(`Process stderr: ${stderr}`);
        }

        resolve({
          output,
          exitCode: exitCode ?? (this.killed ? 130 : 1),
          timedOut,
          contextOverflow,
          usageData,
        });
      });
    });
  }

  /**
   * Kill the active process gracefully.
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
