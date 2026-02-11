import { VALID_TASK_EFFORTS, TaskEffortLevel } from '../types/config.js';
import { isValidModelName } from './config.js';

/**
 * Parsed frontmatter metadata from a plan file.
 */
export interface PlanFrontmatter {
  /** Task complexity label (low/medium/high). Used to resolve model via effortMapping. */
  effort?: TaskEffortLevel;
  /** Explicit model override (bypasses effort mapping but still subject to ceiling). */
  model?: string;
}

/**
 * Result of parsing frontmatter from a plan file.
 */
export interface FrontmatterParseResult {
  /** Parsed frontmatter metadata, if any valid keys were found. */
  frontmatter: PlanFrontmatter;
  /** Whether valid frontmatter was found (has at least effort or model). */
  hasFrontmatter: boolean;
  /** Warnings about invalid/unknown frontmatter values. */
  warnings: string[];
}

/**
 * Parse Obsidian-style frontmatter from plan file content.
 *
 * Supports two formats:
 * 1. Standard format (preferred): `---` delimiter at the top and bottom
 * 2. Legacy format (backward compatibility): properties followed by closing `---` only
 *
 * Standard format example:
 * ```
 * ---
 * effort: medium
 * model: sonnet
 * ---
 * # Task: ...
 * ```
 *
 * Legacy format example:
 * ```
 * effort: medium
 * model: sonnet
 * ---
 * # Task: ...
 * ```
 *
 * The parser is lenient:
 * - Ignores unknown keys (with a warning)
 * - Handles missing `---` delimiter gracefully (returns empty frontmatter)
 * - Invalid values produce warnings but don't throw
 * - Case-insensitive value parsing for effort levels
 */
export function parsePlanFrontmatter(content: string): FrontmatterParseResult {
  const result: FrontmatterParseResult = {
    frontmatter: {},
    hasFrontmatter: false,
    warnings: [],
  };

  const trimmedContent = content.trimStart();

  let frontmatterSection: string;

  if (trimmedContent.startsWith('---')) {
    // Standard format: ---\nkey: value\n---
    const afterOpener = trimmedContent.substring(3);
    // Skip the rest of the opener line (handles "---\n" or "--- \n")
    const openerEnd = afterOpener.indexOf('\n');
    if (openerEnd === -1) {
      // No newline after opening delimiter - no valid frontmatter
      return result;
    }
    const rest = afterOpener.substring(openerEnd + 1);
    const closerIndex = rest.indexOf('---');
    if (closerIndex === -1) {
      // No closing delimiter - no valid frontmatter
      return result;
    }
    frontmatterSection = rest.substring(0, closerIndex);
  } else {
    // Legacy format: key: value\n---
    const delimiterIndex = content.indexOf('---');
    if (delimiterIndex === -1) {
      // No delimiter found - no frontmatter
      return result;
    }
    frontmatterSection = content.substring(0, delimiterIndex);
  }

  // Parse key: value lines
  const lines = frontmatterSection.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // Skip empty lines

    // Check if it looks like a markdown heading (starts with #) - even if it has a colon
    if (trimmed.startsWith('#')) {
      // Markdown content started before `---` - no valid frontmatter
      return {
        frontmatter: {},
        hasFrontmatter: false,
        warnings: ['Frontmatter section contains markdown content before closing delimiter'],
      };
    }

    // Parse key: value format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue; // Skip non-property lines
    }

    const key = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (key === 'effort') {
      const lowerValue = value.toLowerCase();
      if ((VALID_TASK_EFFORTS as readonly string[]).includes(lowerValue)) {
        result.frontmatter.effort = lowerValue as TaskEffortLevel;
        result.hasFrontmatter = true;
      } else {
        result.warnings.push(`Invalid effort value: "${value}". Must be one of: ${VALID_TASK_EFFORTS.join(', ')}`);
      }
    } else if (key === 'model') {
      if (isValidModelName(value)) {
        result.frontmatter.model = value;
        result.hasFrontmatter = true;
      } else {
        result.warnings.push(`Invalid model value: "${value}". Must be a short alias (sonnet, haiku, opus) or a full model ID.`);
      }
    } else {
      // Unknown key - ignore with warning
      result.warnings.push(`Unknown frontmatter key: "${key}"`);
    }
  }

  return result;
}
