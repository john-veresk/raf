import * as pty from 'node-pty';
import type { IDisposable } from 'node-pty';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { killProcessGroup } from '../utils/process-kill.js';
import { renderCodexStreamEvent } from '../parsers/codex-stream-renderer.js';
import { getModel } from '../utils/config.js';
import { mergeUsageData } from '../utils/token-tracker.js';
import { forwardTerminalResize } from '../utils/pty-resize.js';
import type { CodexExecutionMode } from '../types/config.js';
import type { ICliRunner } from './runner-interface.js';
import type { RunnerOptions, RunnerConfig, RunResult, RateLimitInfo } from './runner-types.js';
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
// Verified against codex-cli 0.121.0: `codex features list` advertises this
// startup-only flag, and launching Codex with `--enable ...` exposes
// `request_user_input` to RAF planning sessions in Default mode.
const CODEX_PLANNING_REQUEST_USER_INPUT_FEATURE = 'default_mode_request_user_input';

function getCodexVersion(codexPath: string): string | null {
  try {
    return execFileSync(codexPath, ['--version'], { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function ensureCodexPlanningFeatureAvailable(codexPath: string): void {
  try {
    const featuresOutput = execFileSync(codexPath, ['features', 'list'], { encoding: 'utf-8' });
    const featureLine = featuresOutput
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith(CODEX_PLANNING_REQUEST_USER_INPUT_FEATURE));

    if (featureLine && !/\bremoved\b/i.test(featureLine)) {
      return;
    }
  } catch {
    // Fall through to the shared actionable error below.
  }

  const version = getCodexVersion(codexPath);
  const versionText = version ? `${version}` : 'unknown version';
  throw new Error(
    `Codex CLI ${versionText} cannot start RAF planning sessions with request_user_input support. ` +
    `RAF planning on Codex requires the CLI startup override ` +
    `\`--enable ${CODEX_PLANNING_REQUEST_USER_INPUT_FEATURE}\`, but this installation does not advertise that capability. ` +
    'Upgrade Codex CLI (verified on codex-cli 0.121.0) or use a Claude planning model.'
  );
}

/**
 * Parse a time-of-day string like "10am" or "1pm" into a Date.
 * Assumes today (or tomorrow if the time has already passed).
 */
function parseResetTime(timeStr: string): Date {
  const match = timeStr.match(/^(\d{1,2})(am|pm)$/i);
  if (!match || !match[1] || !match[2]) return new Date(Date.now() + 3600000);
  let hours = parseInt(match[1], 10);
  const isPm = match[2].toLowerCase() === 'pm';
  if (isPm && hours !== 12) hours += 12;
  if (!isPm && hours === 12) hours = 0;
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(hours, 0, 0, 0);
  if (reset <= now) {
    reset.setDate(reset.getDate() + 1);
  }
  return reset;
}

/**
 * Detect rate limit info from plain text output/stderr as a fallback.
 */
function detectRateLimitFromText(output: string, stderr: string): RateLimitInfo | undefined {
  const combined = `${output}\n${stderr}`;

  const hitLimitMatch = combined.match(/you've hit your limit.*resets\s+(\d{1,2}(?:am|pm))/i);
  if (hitLimitMatch?.[1]) {
    return { resetsAt: parseResetTime(hitLimitMatch[1]), limitType: 'quota_exhaustion' };
  }

  const resetsAtMatch = combined.match(/resets at\s+(.+)/i);
  if (resetsAtMatch?.[1]) {
    const parsed = new Date(resetsAtMatch[1].trim());
    if (!isNaN(parsed.getTime())) {
      return { resetsAt: parsed, limitType: 'quota_exhaustion' };
    }
  }

  // Codex-specific: "Try again at <timestamp>"
  const tryAgainMatch = combined.match(/try again at\s+(.+)/i);
  if (tryAgainMatch?.[1]) {
    const parsed = new Date(tryAgainMatch[1].trim());
    if (!isNaN(parsed.getTime())) {
      return { resetsAt: parsed, limitType: 'usage_limit_reached' };
    }
  }

  if (/usage.limit.reached/i.test(combined)) {
    return { resetsAt: new Date(Date.now() + 3600000), limitType: 'usage_limit_reached' };
  }

  // Codex-specific: "Upgrade to Plus/Pro" suggests plan-based limit
  if (/upgrade to (plus|pro)/i.test(combined)) {
    return { resetsAt: new Date(Date.now() + 3600000), limitType: 'usage_limit_reached' };
  }

  return undefined;
}

/**
 * Check a parsed Codex JSON event for usage_limit_reached error.
 * Handles both top-level error_type and nested error.type formats.
 * Returns undefined for server_is_overloaded / slow_down (capacity, not quota).
 */
function detectCodexRateLimitFromEvent(line: string): RateLimitInfo | undefined {
  try {
    const obj = JSON.parse(line);
    const errorType = obj.error_type ?? obj.error?.type;

    // Server overload is a capacity issue — do not treat as rate limit
    if (errorType === 'server_is_overloaded' || errorType === 'slow_down') {
      return undefined;
    }

    if (errorType === 'usage_limit_reached') {
      const rawResets = obj.resets_at ?? obj.error?.resets_at;
      let resetsAt: Date;
      if (rawResets) {
        resetsAt = new Date(typeof rawResets === 'number' ? rawResets * 1000 : rawResets);
        if (isNaN(resetsAt.getTime())) resetsAt = new Date(Date.now() + 3600000);
      } else {
        resetsAt = new Date(Date.now() + 3600000);
      }
      return { resetsAt, limitType: 'usage_limit_reached' };
    }
  } catch {
    // Not JSON, ignore
  }
  return undefined;
}

export class CodexRunner implements ICliRunner {
  private activeProcess: pty.IPty | null = null;
  private killed = false;
  private model: string;
  private reasoningEffort?: string;
  private fast: boolean;
  private codexExecutionMode: CodexExecutionMode;

  constructor(config: RunnerConfig = {}) {
    this.model = config.model ?? getModel('execute').model;
    this.reasoningEffort = config.reasoningEffort;
    this.fast = config.fast ?? false;
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
    const {
      cwd = process.cwd(),
      dangerouslySkipPermissions = false,
      interactiveIntent = 'default',
    } = options;

    return new Promise((resolve) => {
      const combinedPrompt = buildCombinedPrompt(systemPrompt, userMessage);
      const codexPath = getCodexPath();
      const args = ['-m', this.model];

      if (interactiveIntent === 'planning') {
        ensureCodexPlanningFeatureAvailable(codexPath);
        args.push('--enable', CODEX_PLANNING_REQUEST_USER_INPUT_FEATURE);
      }

      // Add reasoning effort via config override when configured
      if (this.reasoningEffort) {
        args.push('-c', `model_reasoning_effort="${this.reasoningEffort}"`);
      }

      if (this.fast) {
        args.push('-c', 'service_tier="fast"');
      }

      if (dangerouslySkipPermissions) {
        args.push('--dangerously-bypass-approvals-and-sandbox');
      }

      args.push(combinedPrompt);

      logger.debug(`Starting interactive Codex session with model: ${this.model}`);

      this.activeProcess = pty.spawn(codexPath, args, {
        name: 'xterm-256color',
        cols: process.stdout.columns ?? 80,
        rows: process.stdout.rows ?? 24,
        cwd,
        env: process.env as Record<string, string>,
      });
      const cleanupResizeForwarding = forwardTerminalResize(this.activeProcess);

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
        cleanupResizeForwarding();
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
    const { timeout = 60, cwd = process.cwd(), outcomeFilePath, verboseCheck } = options;
    const validatedTimeout = Number(timeout) > 0 ? Number(timeout) : 60;
    const timeoutMs = validatedTimeout * 60 * 1000;

    const shouldDisplay = verboseCheck ?? (() => verbose);

    return new Promise((resolve) => {
      let output = '';
      let stderr = '';
      let timedOut = false;
      let contextOverflow = false;
      let usageData: import('../types/config.js').UsageData | undefined;
      let rateLimitInfo: RateLimitInfo | undefined;

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

      if (this.fast) {
        execArgs.push('-c', 'service_tier="fast"');
      }

      execArgs.push(prompt);

      const proc = spawn(codexPath, execArgs, {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      // Track this process
      this.activeProcess = proc as any;
      logger.debug('Process spawned');

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn('Codex session timed out');
        killProcessGroup(proc, 'timeout');
      }, timeoutMs);

      // Set up completion detection (stdout marker + outcome file polling)
      const completionDetector = createCompletionDetector(
        () => killProcessGroup(proc, 'completion detected'),
        outcomeFilePath,
        options.onOutcomeFileMarker,
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

          // Check for rate limit: renderer detection first, then raw JSONL fallback
          if (!rateLimitInfo) {
            if (rendered.rateLimitInfo) {
              rateLimitInfo = rendered.rateLimitInfo;
            } else {
              const rl = detectCodexRateLimitFromEvent(line);
              if (rl) rateLimitInfo = rl;
            }
          }

          if (rendered.textContent) {
            output += rendered.textContent;

            // Check for completion marker to start grace period
            completionDetector.checkOutput(output);

            // Check for context overflow
            for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
              if (pattern.test(rendered.textContent)) {
                contextOverflow = true;
                logger.warn('Context overflow detected');
                killProcessGroup(proc, 'context overflow');
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
          if (!rateLimitInfo) {
            if (rendered.rateLimitInfo) {
              rateLimitInfo = rendered.rateLimitInfo;
            } else {
              const rl = detectCodexRateLimitFromEvent(lineBuffer);
              if (rl) rateLimitInfo = rl;
            }
          }
          if (shouldDisplay() && rendered.display) {
            process.stdout.write(rendered.display);
          }
        }

        // Text fallback: detect rate limit from output/stderr if not already captured
        if (!rateLimitInfo) {
          rateLimitInfo = detectRateLimitFromText(output, stderr);
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
          rateLimitInfo,
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

      // For spawn() ChildProcess (used by _runExec), use killProcessGroup for reliable termination
      // For PTY processes (used by runInteractive), fall back to direct kill
      if (typeof this.activeProcess.write !== 'function' && 'pid' in this.activeProcess) {
        killProcessGroup(this.activeProcess as any, 'manual kill');
      } else {
        // Force kill after 5 seconds if still running (PTY process)
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
  }

  /**
   * Check if a process is currently running.
   */
  isRunning(): boolean {
    return this.activeProcess !== null;
  }
}
