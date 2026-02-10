import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { getModel, getClaudeCommand } from '../utils/config.js';

/**
 * Failure types that can be detected programmatically without using the API.
 */
export type ProgrammaticFailureType =
  | 'api_error'
  | 'rate_limit'
  | 'timeout'
  | 'context_overflow';

/**
 * Result of analyzing task failure.
 */
export interface FailureAnalysisResult {
  failureReason: string;
  analysis: string;
  suggestedFix: string;
  relevantOutput: string;
}

/**
 * Patterns for detecting programmatic failure types.
 */
const API_ERROR_PATTERNS = [
  /api error/i,
  /internal server error/i,
  /service unavailable/i,
  /bad gateway/i,
  /500\s+(internal\s+)?server\s+error/i,
  /502\s+bad\s+gateway/i,
  /503\s+service\s+unavailable/i,
  /504\s+gateway\s+timeout/i,
  /APIError/i,
  /API request failed/i,
];

const RATE_LIMIT_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /429\s+too\s+many\s+requests/i,
  /quota exceeded/i,
  /request limit/i,
  /throttl/i,
];

const CONTEXT_OVERFLOW_PATTERNS = [
  /context length exceeded/i,
  /token limit/i,
  /maximum context/i,
  /context window/i,
  /too many tokens/i,
  /max.*tokens/i,
];

/**
 * Detect if the failure is a known programmatic failure type.
 * Returns null if the failure type requires AI analysis.
 */
export function detectProgrammaticFailure(
  output: string,
  failureReason: string
): ProgrammaticFailureType | null {
  const combined = `${output}\n${failureReason}`;

  // Check for context overflow
  for (const pattern of CONTEXT_OVERFLOW_PATTERNS) {
    if (pattern.test(combined)) {
      return 'context_overflow';
    }
  }

  // Check for rate limiting
  for (const pattern of RATE_LIMIT_PATTERNS) {
    if (pattern.test(combined)) {
      return 'rate_limit';
    }
  }

  // Check for API errors
  for (const pattern of API_ERROR_PATTERNS) {
    if (pattern.test(combined)) {
      return 'api_error';
    }
  }

  // Check for timeout (usually passed in failureReason)
  if (/timeout|timed out/i.test(failureReason)) {
    return 'timeout';
  }

  return null;
}

/**
 * Generate a programmatic failure report for known failure types.
 */
export function generateProgrammaticReport(
  failureType: ProgrammaticFailureType,
  _failureReason: string,
  output: string
): string {
  const relevantOutput = extractRelevantOutput(output, 50);

  switch (failureType) {
    case 'api_error':
      return `## Failure Reason
API error occurred during task execution.

## Analysis
The Claude API returned an error response. This is typically a temporary issue with the API service.

## Suggested Fix
- Wait a few minutes and retry the task
- Check the Anthropic status page for any ongoing incidents
- If the issue persists, try running with a smaller context

## Relevant Output
\`\`\`
${relevantOutput}
\`\`\`

<promise>FAILED</promise>`;

    case 'rate_limit':
      return `## Failure Reason
Rate limit exceeded during task execution.

## Analysis
The API rate limit was reached. This typically happens when too many requests are made in a short period.

## Suggested Fix
- Wait 1-2 minutes before retrying
- If using parallel execution, reduce concurrency
- Consider upgrading your API tier for higher limits

## Relevant Output
\`\`\`
${relevantOutput}
\`\`\`

<promise>FAILED</promise>`;

    case 'timeout':
      return `## Failure Reason
Task execution timed out.

## Analysis
The task took longer than the configured timeout to complete. This could indicate:
- The task is too complex or large for a single execution
- Claude is stuck or making slow progress
- Network issues causing delays

## Suggested Fix
- Increase the timeout with \`--timeout <minutes>\`
- Break the task into smaller subtasks
- Check the logs for what Claude was doing before timeout

## Relevant Output
\`\`\`
${relevantOutput}
\`\`\`

<promise>FAILED</promise>`;

    case 'context_overflow':
      return `## Failure Reason
Context window exceeded during task execution.

## Analysis
The conversation context grew too large for Claude to process. This typically happens when:
- Too much code or output was included in the context
- The task involves very large files
- Multiple previous outcomes created a large context

## Suggested Fix
- Break the task into smaller, independent subtasks
- Reduce the amount of context passed to Claude
- Consider processing files in chunks

## Relevant Output
\`\`\`
${relevantOutput}
\`\`\`

<promise>FAILED</promise>`;
  }
}

/**
 * Extract the most relevant portion of output for the failure report.
 */
function extractRelevantOutput(output: string, maxLines: number): string {
  // Remove ANSI codes
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');

  // Split into lines
  const lines = cleanOutput.split('\n');

  // If output is small enough, return all of it
  if (lines.length <= maxLines) {
    return cleanOutput.trim();
  }

  // Otherwise, take the last N lines (most relevant for failures)
  const lastLines = lines.slice(-maxLines);
  return `...(truncated)\n${lastLines.join('\n').trim()}`;
}

/**
 * Get the path to Claude CLI.
 */
function getClaudePath(): string {
  const cmd = getClaudeCommand();
  try {
    return execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Claude CLI not found. Please ensure it is installed and in your PATH.');
  }
}

/**
 * Analyze a failure using Claude (Sonnet/Haiku) and generate a structured report.
 * Uses a fast model for cost efficiency.
 */
export async function analyzeFailure(
  output: string,
  failureReason: string,
  taskId: string,
  timeoutMs: number = 60000
): Promise<string> {
  // First check for programmatic failures
  const programmaticType = detectProgrammaticFailure(output, failureReason);
  if (programmaticType) {
    return generateProgrammaticReport(programmaticType, failureReason, output);
  }

  // For other failures, use Claude to analyze
  try {
    const analysisResult = await callClaudeForAnalysis(output, failureReason, taskId, timeoutMs);
    return analysisResult;
  } catch (error) {
    // If analysis fails, generate a basic fallback report
    const relevantOutput = extractRelevantOutput(output, 50);
    return `## Failure Reason
${failureReason}

## Analysis
Unable to perform automated analysis: ${error instanceof Error ? error.message : String(error)}

## Suggested Fix
Review the relevant output below and the task logs for more details.

## Relevant Output
\`\`\`
${relevantOutput}
\`\`\`

<promise>FAILED</promise>`;
  }
}

/**
 * Call Claude CLI to analyze the failure.
 * Uses the print mode with a concise prompt.
 */
async function callClaudeForAnalysis(
  output: string,
  failureReason: string,
  taskId: string,
  timeoutMs: number
): Promise<string> {
  const relevantOutput = extractRelevantOutput(output, 100);

  const prompt = `Analyze this failed task execution and generate a brief failure report.

Task ID: ${taskId}
Initial Failure Reason: ${failureReason}

Execution Output (last 100 lines):
\`\`\`
${relevantOutput}
\`\`\`

Respond with ONLY a markdown report in this exact format:

## Failure Reason
[One-line description of what went wrong]

## Analysis
[2-3 sentences explaining why the failure occurred]

## Suggested Fix
[1-3 bullet points with actionable steps to resolve]

## Relevant Output
\`\`\`
[Key error messages or output that shows the failure]
\`\`\`

<promise>FAILED</promise>`;

  return new Promise((resolve, reject) => {
    let analysisOutput = '';
    let stderr = '';

    const claudePath = getClaudePath();

    // Use configured model for failure analysis
    const failureModel = getModel('failureAnalysis');
    const proc = spawn(claudePath, [
      '--model', failureModel,
      '--dangerously-skip-permissions',
      '-p',
      prompt,
    ], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Analysis timed out'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      analysisOutput += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(new Error(`Analysis failed with exit code ${exitCode}: ${stderr}`));
        return;
      }

      // Validate the output has the expected structure
      if (!analysisOutput.includes('## Failure Reason') ||
          !analysisOutput.includes('<promise>FAILED</promise>')) {
        // If the output doesn't have the expected structure, wrap it
        const fixedOutput = `## Failure Reason
${failureReason}

## Analysis
${analysisOutput.trim()}

## Suggested Fix
Review the task logs for more details.

## Relevant Output
\`\`\`
${extractRelevantOutput(output, 30)}
\`\`\`

<promise>FAILED</promise>`;
        resolve(fixedOutput);
        return;
      }

      resolve(analysisOutput.trim());
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
