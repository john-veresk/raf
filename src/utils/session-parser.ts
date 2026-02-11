/**
 * Utilities for parsing Claude CLI session files to extract token usage data.
 * Claude CLI saves session data to ~/.claude/projects/<escaped-path>/<session-id>.jsonl
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { UsageData } from '../types/config.js';

/** Raw usage structure from Claude session JSONL assistant message entries. */
interface SessionMessageUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** Structure of an assistant message entry in the session JSONL. */
interface SessionMessageEntry {
  type: 'assistant';
  message?: {
    usage?: SessionMessageUsage;
    model?: string;
  };
  costUSD?: number;
}

/** Result of parsing a session file. */
export interface SessionParseResult {
  /** Accumulated usage data from all assistant messages. */
  usage: UsageData;
  /** Whether parsing was successful. */
  success: boolean;
  /** Error message if parsing failed. */
  error?: string;
}

/**
 * Escape a path for use in Claude's project directory naming scheme.
 * Claude escapes `/` to `-` in project paths.
 */
export function escapeProjectPath(projectPath: string): string {
  // Remove leading slash and replace remaining slashes with dashes
  return projectPath.replace(/^\//, '').replace(/\//g, '-');
}

/**
 * Compute the expected session file path for a given session ID and working directory.
 *
 * @param sessionId - The UUID session ID passed to --session-id
 * @param cwd - The working directory where Claude was run (project path)
 * @returns The expected path to the session JSONL file
 */
export function getSessionFilePath(sessionId: string, cwd: string): string {
  const claudeDir = path.join(os.homedir(), '.claude', 'projects');
  const escapedPath = escapeProjectPath(cwd);
  return path.join(claudeDir, escapedPath, `${sessionId}.jsonl`);
}

/**
 * Parse a Claude session JSONL file and extract accumulated token usage data.
 *
 * @param sessionFilePath - Path to the session JSONL file
 * @returns Parsed usage data or error information
 */
export function parseSessionFile(sessionFilePath: string): SessionParseResult {
  const emptyUsage: UsageData = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    modelUsage: {},
  };

  if (!fs.existsSync(sessionFilePath)) {
    return {
      usage: emptyUsage,
      success: false,
      error: `Session file not found: ${sessionFilePath}`,
    };
  }

  try {
    const content = fs.readFileSync(sessionFilePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    const accumulated: UsageData = { ...emptyUsage, modelUsage: {} };

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;

        // Only process assistant message entries
        if (entry.type !== 'assistant') continue;

        const assistantEntry = entry as unknown as SessionMessageEntry;
        const usage = assistantEntry.message?.usage;
        const model = assistantEntry.message?.model;

        if (!usage) continue;

        const inputTokens = usage.input_tokens ?? 0;
        const outputTokens = usage.output_tokens ?? 0;
        const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
        const cacheCreateTokens = usage.cache_creation_input_tokens ?? 0;

        // Accumulate aggregate totals
        accumulated.inputTokens += inputTokens;
        accumulated.outputTokens += outputTokens;
        accumulated.cacheReadInputTokens += cacheReadTokens;
        accumulated.cacheCreationInputTokens += cacheCreateTokens;

        // Accumulate per-model usage
        if (model) {
          const existing = accumulated.modelUsage[model];
          if (existing) {
            existing.inputTokens += inputTokens;
            existing.outputTokens += outputTokens;
            existing.cacheReadInputTokens += cacheReadTokens;
            existing.cacheCreationInputTokens += cacheCreateTokens;
          } else {
            accumulated.modelUsage[model] = {
              inputTokens,
              outputTokens,
              cacheReadInputTokens: cacheReadTokens,
              cacheCreationInputTokens: cacheCreateTokens,
            };
          }
        }
      } catch {
        // Skip malformed lines
        continue;
      }
    }

    return {
      usage: accumulated,
      success: true,
    };
  } catch (error) {
    return {
      usage: emptyUsage,
      success: false,
      error: `Failed to parse session file: ${error}`,
    };
  }
}

/**
 * Parse a Claude session by session ID and working directory.
 * Convenience wrapper around getSessionFilePath + parseSessionFile.
 *
 * @param sessionId - The UUID session ID passed to --session-id
 * @param cwd - The working directory where Claude was run
 * @returns Parsed usage data or error information
 */
export function parseSessionById(sessionId: string, cwd: string): SessionParseResult {
  const filePath = getSessionFilePath(sessionId, cwd);
  return parseSessionFile(filePath);
}
