import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { logger } from '../utils/logger.js';
import { extractProjectName, getInputPath, getDecisionsPath, getOutcomesDir, TASK_ID_PATTERN } from '../utils/paths.js';

export interface PrCreateResult {
  success: boolean;
  prUrl?: string;
  error?: string;
}

export interface PrPreflightResult {
  ready: boolean;
  ghInstalled: boolean;
  ghAuthenticated: boolean;
  isGitHubRemote: boolean;
  branchPushed: boolean;
  error?: string;
}

/**
 * Check if the `gh` CLI is installed.
 */
export function isGhInstalled(): boolean {
  try {
    execSync('gh --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the `gh` CLI is authenticated.
 */
export function isGhAuthenticated(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the git remote is a GitHub repository.
 */
export function isGitHubRemote(cwd?: string): boolean {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    }).trim();
    return remoteUrl.includes('github.com');
  } catch {
    return false;
  }
}

/**
 * Push the current branch to the remote origin.
 * Returns true if the push succeeds.
 */
export function pushBranch(branch: string, cwd?: string): boolean {
  try {
    execSync(`git push -u origin "${branch}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the branch has been pushed to the remote.
 */
export function isBranchPushed(branch: string, cwd?: string): boolean {
  try {
    const output = execSync(`git ls-remote --heads origin "${branch}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    }).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/**
 * Detect the base branch for a PR.
 * Returns the branch from which the worktree was forked (typically main or master).
 */
export function detectBaseBranch(cwd?: string): string | null {
  // Try to find the default branch from the remote
  try {
    const output = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...(cwd ? { cwd } : {}),
    }).trim();
    // Output is like "refs/remotes/origin/main"
    const parts = output.split('/');
    return parts[parts.length - 1] ?? null;
  } catch {
    // Fallback: check for common branch names
  }

  // Try common default branches
  for (const branch of ['main', 'master']) {
    try {
      execSync(`git rev-parse --verify "refs/heads/${branch}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...(cwd ? { cwd } : {}),
      });
      return branch;
    } catch {
      // Try next
    }
  }

  return null;
}

/**
 * Run preflight checks for PR creation.
 * Returns detailed status of each prerequisite.
 */
export function prPreflight(branch: string, cwd?: string): PrPreflightResult {
  const result: PrPreflightResult = {
    ready: false,
    ghInstalled: false,
    ghAuthenticated: false,
    isGitHubRemote: false,
    branchPushed: false,
  };

  result.ghInstalled = isGhInstalled();
  if (!result.ghInstalled) {
    result.error = 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/';
    return result;
  }

  result.ghAuthenticated = isGhAuthenticated();
  if (!result.ghAuthenticated) {
    result.error = 'GitHub CLI is not authenticated. Run `gh auth login` to authenticate.';
    return result;
  }

  result.isGitHubRemote = isGitHubRemote(cwd);
  if (!result.isGitHubRemote) {
    result.error = 'The git remote is not a GitHub repository. PR creation requires a GitHub remote.';
    return result;
  }

  result.branchPushed = isBranchPushed(branch, cwd);
  // Branch not pushed is not a blocker - we'll push it

  result.ready = true;
  return result;
}

/**
 * Generate a human-readable PR title from the project folder name.
 * E.g., "021b5g-merge-guardian" -> "Merge guardian"
 */
export function generatePrTitle(projectPath: string): string {
  const name = extractProjectName(projectPath);
  if (!name) {
    return 'Feature branch';
  }
  // Convert kebab-case to space-separated, capitalize first letter
  const words = name.split('-');
  words[0] = words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1);
  return words.join(' ');
}

/**
 * Read project context for PR body generation.
 * Gathers input.md, decisions.md, and outcome files.
 */
export function readProjectContext(projectPath: string): {
  input: string | null;
  decisions: string | null;
  outcomes: Array<{ taskId: string; content: string }>;
} {
  let input: string | null = null;
  let decisions: string | null = null;
  const outcomes: Array<{ taskId: string; content: string }> = [];

  const inputPath = getInputPath(projectPath);
  if (fs.existsSync(inputPath)) {
    input = fs.readFileSync(inputPath, 'utf-8');
  }

  const decisionsPath = getDecisionsPath(projectPath);
  if (fs.existsSync(decisionsPath)) {
    decisions = fs.readFileSync(decisionsPath, 'utf-8');
  }

  const outcomesDir = getOutcomesDir(projectPath);
  if (fs.existsSync(outcomesDir)) {
    const files = fs.readdirSync(outcomesDir).filter(f => f.endsWith('.md')).sort();
    const taskIdPattern = new RegExp(`^(${TASK_ID_PATTERN})-`);
    for (const file of files) {
      const match = file.match(taskIdPattern);
      if (match && match[1]) {
        const content = fs.readFileSync(path.join(outcomesDir, file), 'utf-8');
        outcomes.push({ taskId: match[1], content });
      }
    }
  }

  return { input, decisions, outcomes };
}

/**
 * Generate a PR body by calling Claude Sonnet to summarize project context.
 * Falls back to a simple body if Claude is unavailable.
 */
export async function generatePrBody(
  projectPath: string,
  timeoutMs: number = 120000,
): Promise<string> {
  const context = readProjectContext(projectPath);

  // Build context for Claude
  const parts: string[] = [];

  if (context.input) {
    parts.push(`## Project Input\n${context.input}`);
  }

  if (context.decisions) {
    parts.push(`## Key Decisions\n${context.decisions}`);
  }

  if (context.outcomes.length > 0) {
    const outcomeSummaries = context.outcomes.map(o => {
      // Truncate long outcomes
      const truncated = o.content.length > 1000
        ? o.content.slice(0, 1000) + '\n...(truncated)'
        : o.content;
      return `### Task ${o.taskId}\n${truncated}`;
    }).join('\n\n');
    parts.push(`## Task Outcomes\n${outcomeSummaries}`);
  }

  if (parts.length === 0) {
    return generateFallbackBody(projectPath);
  }

  const projectContext = parts.join('\n\n');

  const prompt = `You are generating a Pull Request description for a GitHub PR. Use the project context below to produce a clean, well-structured PR body.

${projectContext}

Respond with ONLY the PR body in this exact format (no extra text, no code fences):

## Summary
[Proofread, clean version of the project requirements from the input — 2-5 sentences describing what this PR accomplishes and why]

## Key Decisions
[The most important design decisions that were made — only include significant ones, not every detail. Use bullet points.]

## What Was Done
[Clear outline of the completed work, organized by task or area. Use bullet points.]

## Test Plan
[1-3 bullet points describing how to verify these changes work correctly]`;

  try {
    const body = await callClaudeForPrBody(prompt, timeoutMs);
    return body;
  } catch (error) {
    logger.debug(`PR body generation via Claude failed: ${error instanceof Error ? error.message : String(error)}`);
    return generateFallbackBody(projectPath);
  }
}

/**
 * Generate a simple fallback PR body when Claude is unavailable.
 */
function generateFallbackBody(projectPath: string): string {
  const context = readProjectContext(projectPath);
  const lines: string[] = ['## Summary'];

  if (context.input) {
    const firstLine = context.input.split('\n').find(l => l.trim() && !l.startsWith('#'));
    if (firstLine) {
      lines.push(firstLine.trim());
    }
  }

  lines.push('');
  lines.push('## Key Decisions');
  if (context.decisions) {
    const firstDecision = context.decisions.split('\n').find(l => l.trim() && !l.startsWith('#'));
    if (firstDecision) {
      lines.push(`- ${firstDecision.trim()}`);
    }
  } else {
    lines.push('- No decisions recorded');
  }

  lines.push('');
  lines.push('## What Was Done');
  if (context.outcomes.length > 0) {
    lines.push(`- ${context.outcomes.length} task(s) completed`);
  } else {
    lines.push('- No tasks completed yet');
  }

  lines.push('');
  lines.push('## Test Plan');
  lines.push('- Review the changes and verify correctness');

  return lines.join('\n');
}

/**
 * Filter Claude CLI output to remove non-markdown log/warning lines.
 * Claude CLI stdout may include warning or progress lines mixed with the response.
 */
export function filterClaudeOutput(output: string): string {
  const lines = output.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    // Skip empty lines at the boundary (we'll let markdown's own blank lines through)
    if (!trimmed) return true;
    // Skip common log/warning patterns
    if (/^(⚠|⚡|🔄|⏳|✓|✗|›|>)\s/.test(trimmed)) return false;
    if (/^\[?(warn|warning|info|debug|error|log)\]?[:\s]/i.test(trimmed)) return false;
    if (/^console\.(warn|log|error|info)/i.test(trimmed)) return false;
    if (/^Note:/i.test(trimmed)) return false;
    if (/^(Loading|Connecting|Fetching|Processing)\b/i.test(trimmed)) return false;
    return true;
  });
  return filtered.join('\n').trim();
}

/**
 * Call Claude Sonnet to generate a PR body.
 */
async function callClaudeForPrBody(prompt: string, timeoutMs: number): Promise<string> {
  let claudePath: string;
  try {
    claudePath = execSync('which claude', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    throw new Error('Claude CLI not found');
  }

  return new Promise((resolve, reject) => {
    let output = '';
    let stderr = '';

    const proc = spawn(claudePath, [
      '--model', 'sonnet',
      '--dangerously-skip-permissions',
      '-p',
      prompt,
    ], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('PR body generation timed out'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timeout);

      if (exitCode !== 0) {
        reject(new Error(`Claude exited with code ${exitCode}: ${stderr}`));
        return;
      }

      const filtered = filterClaudeOutput(output);
      if (!filtered) {
        reject(new Error('Claude returned empty output'));
        return;
      }

      resolve(filtered);
    });

    proc.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Create a GitHub Pull Request using the `gh` CLI.
 *
 * @param branch - The head branch (worktree branch name)
 * @param projectPath - Path to the project folder (for context generation)
 * @param options - Optional overrides
 */
export async function createPullRequest(
  branch: string,
  projectPath: string,
  options?: {
    baseBranch?: string;
    title?: string;
    cwd?: string;
  },
): Promise<PrCreateResult> {
  const cwd = options?.cwd;

  // Run preflight checks
  const preflight = prPreflight(branch, cwd);
  if (!preflight.ready) {
    return { success: false, error: preflight.error };
  }

  // Detect base branch
  const baseBranch = options?.baseBranch ?? detectBaseBranch(cwd);
  if (!baseBranch) {
    return { success: false, error: 'Could not detect base branch. Specify it explicitly.' };
  }

  // Push branch if not already pushed
  if (!preflight.branchPushed) {
    logger.info(`Pushing branch "${branch}" to origin...`);
    const pushed = pushBranch(branch, cwd);
    if (!pushed) {
      return { success: false, error: `Failed to push branch "${branch}" to origin.` };
    }
  }

  // Generate PR title
  const title = options?.title ?? generatePrTitle(projectPath);

  // Generate PR body
  const body = await generatePrBody(projectPath);

  // Write body to temp file to avoid shell escaping issues
  const bodyFile = path.join(os.tmpdir(), `raf-pr-body-${Date.now()}.md`);
  try {
    fs.writeFileSync(bodyFile, body, 'utf-8');

    const result = execSync(
      `gh pr create --title "${title.replace(/"/g, '\\"')}" --base "${baseBranch}" --head "${branch}" --body-file "${bodyFile}"`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        ...(cwd ? { cwd } : {}),
      },
    );

    const prUrl = result.trim();
    return { success: true, prUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to create PR: ${msg}` };
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(bodyFile); } catch { /* ignore */ }
  }
}
