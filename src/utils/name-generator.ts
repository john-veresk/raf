import { execSync } from 'node:child_process';
import { logger } from './logger.js';
import { sanitizeProjectName } from './validation.js';

const HAIKU_MODEL = 'haiku';

const NAME_GENERATION_PROMPT = `Generate a short kebab-case project name (2-4 words, like 'user-auth-flow' or 'api-caching-layer') for this project description. Output ONLY the name, nothing else - no quotes, no explanation, just the kebab-case name.

Project description:`;

/**
 * Generate a project name using Claude Haiku based on the project description.
 * Falls back to extracting words from the description if the API call fails.
 */
export async function generateProjectName(description: string): Promise<string> {
  try {
    const name = await callHaikuForName(description);
    if (name) {
      const sanitized = sanitizeGeneratedName(name);
      if (sanitized) {
        logger.debug(`Generated project name: ${sanitized}`);
        return sanitized;
      }
    }
  } catch (error) {
    logger.debug(`Failed to generate name with Haiku: ${error}`);
  }

  // Fallback to extracting words from description
  return generateFallbackName(description);
}

/**
 * Call Claude Haiku to generate a project name.
 */
async function callHaikuForName(description: string): Promise<string | null> {
  try {
    const fullPrompt = `${NAME_GENERATION_PROMPT}\n${description}`;

    // Use claude CLI with --model haiku and --print for non-interactive output
    const result = execSync(
      `claude --model ${HAIKU_MODEL} --print "${escapeShellArg(fullPrompt)}"`,
      {
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    return result.trim();
  } catch (error) {
    logger.debug(`Haiku API call failed: ${error}`);
    return null;
  }
}

/**
 * Escape a string for use as a shell argument.
 */
function escapeShellArg(arg: string): string {
  // Replace double quotes with escaped double quotes
  // Replace backslashes with escaped backslashes
  return arg
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

/**
 * Sanitize the generated name to ensure it's a valid kebab-case folder name.
 */
function sanitizeGeneratedName(name: string): string | null {
  // Remove any leading/trailing whitespace and quotes
  let sanitized = name.trim().replace(/^["']|["']$/g, '');

  // Convert to lowercase
  sanitized = sanitized.toLowerCase();

  // Replace any non-alphanumeric characters with hyphens
  sanitized = sanitized.replace(/[^a-z0-9]+/g, '-');

  // Remove leading and trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Truncate if too long (max 50 chars)
  sanitized = sanitized.substring(0, 50);

  // Return null if the result is empty or too short
  if (sanitized.length < 2) {
    return null;
  }

  return sanitized;
}

/**
 * Generate a fallback name by extracting meaningful words from the description.
 */
function generateFallbackName(description: string): string {
  // Extract first meaningful words from input
  const words = description
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

  const name = sanitizeProjectName(words || 'project');
  logger.debug(`Using fallback project name: ${name}`);
  return name;
}
