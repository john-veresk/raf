import * as pty from 'node-pty';
import type { IDisposable } from 'node-pty';
import { execSync, spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { renderCodexStreamEvent } from '../parsers/codex-stream-renderer.js';
import { getModel } from '../utils/config.js';
import { mergeUsageData } from '../utils/token-tracker.js';
import type { CodexExecutionMode } from '../types/config.js';
import type { ICliRunner } from './runner-interface.js';
import type { RunnerOptions, RunnerConfig, RunResult } from './runner-types.js';
import { createCompletionDetector } from './completion-detector.js';

function getCodexPath(): string {
  try {
    return execSync('which codex', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Codex CLI not found. Please ensure it is installed and in your PATH.');
  }
}

/**
 * Combine system prompt and user message into a single prompt for Codex.
 * Codex CLI does not support a separate --system-prompt flag, so the system
 * instructions are prepended to the user message.
 */
function buildCombinedPrompt(systemPrompt: string, userMessage: string): string {
  return `[System Instructions]\n\n${systemPrompt}\n\n[User Request]\n\n${userMessage}`;
}

const CONTEXT_OVERFLOW_PATTERNS = [
  /context length exceeded/i,
  /token limit/i,
  /maximum context/i,
  /context window/i,
];

const CODEX_EXECUTION_MODE_TO_FLAG: Record<CodexExecutionMode, string> = {
  dangerous: '--dangerously-bypass-approvals-and-sandbox',
  fullAuto: '--full-auto',
};

export class CodexRunner implements ICliRunner {
  private activeProcess: pty.IPty | null = null;
  private killed = false;
  private model: string;
  private reasoningEffort?: string;
  private codexExecutionMode: CodexExecutionMode;

  constructor(config: RunnerConfig = {}) {
    this.model = config.model ?? getModel('execute').model;
    this.reasoningEffort = config.reasoningEffort;
    this.codexExecutionMode = config.codexExecutionMode ?? 'dangerous';
  }

  /**
   * Run Codex interactively with stdin/stdout passthrough via PTY.
   * Spawns `codex -m <model> <combined_prompt>` (no `exec` subcommand).
   */
  async runInteractive(
    systemPrompt: string,
    userMessage: string,
    options: RunnerOptions = {}
  ): Promise<number> {
    const { cwd = process.cwd() } = options;

    return new Promise((resolve) => {
      const combinedPrompt = buildCombinedPrompt(systemPrompt, userMessage);
      const args = ['-m', this.model];

      // Add reasoning effort via config override when configured
      if (this.reasoningEffort) {
        args.push('-c', `model_reasoning_effort="${this.reasoningEffort}"`);
      }

      args.push(combinedPrompt);

      logger.debug(`Starting interactive Codex session with model: ${this.model}`);

      this.activeProcess = pty.spawn(getCodexPath(), args, {
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

      // Pipe input to Codex
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
   * Session resume is not supported by Codex CLI.
   */
  async runResume(_options: RunnerOptions = {}): Promise<number> {
    throw new Error('Session resume is not supported by Codex CLI');
  }

  /**
   * Run Codex non-interactively and collect output.
   * Tool display is suppressed (non-verbose mode).
   */
  async run(prompt: string, options: RunnerOptions = {}): Promise<RunResult> {
    return this._runExec(prompt, options, false);
  }

  /**
   * Run Codex non-interactively with verbose output to stdout.
   * Uses `codex exec <execution-mode> --json` to get JSONL streaming events.
   */
  async runVerbose(prompt: string, options: RunnerOptions = {}): Promise<RunResult> {
    return this._runExec(prompt, options, true);
  }

  /**
   * Internal unified execution method using `codex exec <execution-mode> --json`.
   * Both run() and runVerbose() delegate to this method.
   */
  private async _runExec(
    prompt: string,
    options: RunnerOptions,
    verbose: boolean,
  ): Promise<RunResult> {
    const { timeout = 60, cwd = process.cwd(), outcomeFilePath, commitContext, verboseCheck } = options;
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    const shouldDisplay = verboseCheck ?? (() => verbose);

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;
      let usageData: import('../types/config.js').UsageData | undefined;

      const codexPath = getCodexPath();

      logger.debug(`Starting Codex execution session (json, verbose=${verbose}) with model: ${this.model}`);
      logger.debug(`Prompt length: ${prompt.length}, timeout: ${timeoutMs}ms, cwd: ${cwd}`);
      logger.debug(`Codex path: ${codexPath}`);

      logger.debug('Spawning process...');
      const execArgs = [
        'exec',
        CODEX_EXECUTION_MODE_TO_FLAG[this.codexExecutionMode],
        '--json',
        '--ephemeral',
        '-m',
        this.model,
      ];

      // Add reasoning effort via config override when configured
      if (this.reasoningEffort) {
        execArgs.push('-c', `model_reasoning_effort="${this.reasoningEffort}"`);
      }

      execArgs.push(prompt);

      const proc = spawn(codexPath, execArgs, {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Track this process
      this.activeProcess = proc as any;
      logger.debug('Process spawned');

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Codex session timed out');
        proc.kill('SIGTERM');
      }, timeoutMs);

      // Set up completion detection (stdout marker + outcome file polling)
      const completionDetector = createCompletionDetector(
        () => proc.kill('SIGTERM'),
        outcomeFilePath,
        commitContext,
      );

      // Buffer for incomplete JSONL lines
      let lineBuffer = '';
      let dataReceived = false;

      proc.stdout.on('data', (data) => {
        if (!dataReceived) {
          logger.debug('First data chunk received');
          dataReceived = true;
        }

        lineBuffer += data.toString();

        // Process complete lines from the JSONL stream
        let newlineIndex: number;
        while ((newlineIndex = lineBuffer.indexOf('\n')) !== -1) {
          const line = lineBuffer.substring(0, newlineIndex);
          lineBuffer = lineBuffer.substring(newlineIndex + 1);

          const rendered = renderCodexStreamEvent(line);

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

          if (rendered.usageData) {
            usageData = mergeUsageData(usageData, rendered.usageData);
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
          const rendered = renderCodexStreamEvent(lineBuffer);
          if (rendered.textContent) {
            output += rendered.textContent;
          }
          if (rendered.usageData) {
            usageData = mergeUsageData(usageData, rendered.usageData);
          }
          if (shouldDisplay() && rendered.display) {
            process.stdout.write(rendered.display);
          }
        }

        clearTimeout(timeoutHandle);
        completionDetector.cleanup();
        this.activeProcess = null;
        logger.debug(`Codex exited with code ${exitCode}, output length: ${output.length}, timedOut: ${timedOut}, contextOverflow: ${contextOverflow}`);

        if (stderr) {
          logger.debug(`Codex stderr: ${stderr}`);
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
   * Kill the active Codex process gracefully.
   */
  kill(): void {
    if (this.activeProcess) {
      this.killed = true;

      // Send Ctrl+C first for graceful shutdown (only for PTY processes)
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
