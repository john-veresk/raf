import { spawn } from 'node:child_process';
import { logger } from './logger.js';
import { sanitizeProjectName } from './validation.js';
import { getModel, getClaudeCommand } from './config.js';

const NAME_GENERATION_PROMPT = `Generate a short, punchy, creative project name (1-3 words, kebab-case).

Be creative! Use metaphors, analogies, or evocative words that capture the SPIRIT of the project.
Don't literally describe what it does - make it memorable and fun.

Good examples:
- Bug fix → 'bug-squasher', 'exterminator', 'patch-adams'
- Performance optimization → 'turbo-boost', 'lightning-rod', 'speed-demon'
- Auth system → 'gatekeeper', 'bouncer', 'key-master'
- Refactoring → 'spring-cleaning', 'phoenix', 'makeover'
- New feature → 'moonshot', 'secret-sauce', 'magic-wand'

Output ONLY the kebab-case name. No quotes, no explanation.

Project description:`;

const MULTI_NAME_GENERATION_PROMPT = `Generate 5 creative project names for the description below.

IMPORTANT: Each name should use a DIFFERENT naming style:
1. **Metaphorical** - Use a metaphor or analogy (e.g., 'phoenix', 'lighthouse', 'compass')
2. **Fun/Playful** - Make it fun or quirky (e.g., 'turbo-boost', 'magic-beans', 'ninja-move')
3. **Action-oriented** - Focus on what it does with flair (e.g., 'bug-squasher', 'speed-demon', 'data-whisperer')
4. **Abstract** - Use abstract/poetic concepts (e.g., 'horizon', 'cascade', 'catalyst')
5. **Cultural reference** - Reference pop culture, mythology, or literature (e.g., 'atlas', 'merlin', 'gandalf')

Rules:
- Each name should be 1-3 words in kebab-case
- Names must be lowercase with hyphens only
- Make them memorable and evocative
- If the project has many unrelated tasks, prefer abstract/metaphorical/fun names over descriptive ones

Output format: ONLY output 5 names, one per line, no numbers, no explanations, no quotes.

Project description:`;

/**
 * Run Claude CLI with the given prompt and return stdout.
 * Uses spawn with --no-session-persistence to avoid cluttering session history.
 */
function runClaudePrint(prompt: string): Promise<string | null> {
  return new Promise((resolve) => {
    const model = getModel('nameGeneration');
    const cmd = getClaudeCommand();

    const proc = spawn(cmd, [
      '--model', model,
      '--no-session-persistence',
      '-p',
      prompt,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timeoutHandle = setTimeout(() => {
      proc.kill('SIGTERM');
    }, 30000);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      clearTimeout(timeoutHandle);
      if (exitCode !== 0) {
        if (stderr) {
          logger.debug(`Claude CLI stderr: ${stderr}`);
        }
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutHandle);
      logger.debug(`Claude CLI spawn error: ${error}`);
      resolve(null);
    });
  });
}

/**
 * Generate a single project name using Claude.
 * Falls back to extracting words from the description if the API call fails.
 */
export async function generateProjectName(description: string): Promise<string> {
  try {
    const name = await callSonnetForName(description);
    if (name) {
      const sanitized = sanitizeGeneratedName(name);
      if (sanitized) {
        logger.debug(`Generated project name: ${sanitized}`);
        return sanitized;
      }
    }
  } catch (error) {
    logger.debug(`Failed to generate name with Claude: ${error}`);
  }

  // Fallback to extracting words from description
  return generateFallbackName(description);
}

/**
 * Generate multiple project name suggestions using Claude.
 * Returns 3-5 unique names with varied styles.
 */
export async function generateProjectNames(description: string): Promise<string[]> {
  try {
    const names = await callSonnetForMultipleNames(description);
    if (names.length >= 3) {
      logger.debug(`Generated ${names.length} project names`);
      return names;
    }
  } catch (error) {
    logger.debug(`Failed to generate names with Claude: ${error}`);
  }

  // Fallback: generate a single fallback name
  const fallbackName = generateFallbackName(description);
  logger.debug(`Using fallback name: ${fallbackName}`);
  return [fallbackName];
}

/**
 * Call Claude to generate a single project name.
 */
async function callSonnetForName(description: string): Promise<string | null> {
  const fullPrompt = `${NAME_GENERATION_PROMPT}\n${description}`;
  return runClaudePrint(fullPrompt);
}

/**
 * Call Claude to generate multiple project names.
 */
async function callSonnetForMultipleNames(description: string): Promise<string[]> {
  const fullPrompt = `${MULTI_NAME_GENERATION_PROMPT}\n${description}`;
  const result = await runClaudePrint(fullPrompt);

  if (!result) {
    return [];
  }

  // Parse the multiline response
  const lines = result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Sanitize and validate each name
  const validNames: string[] = [];
  for (const line of lines) {
    const sanitized = sanitizeGeneratedName(line);
    if (sanitized && !validNames.includes(sanitized)) {
      validNames.push(sanitized);
    }
  }

  // Return 3-5 names
  return validNames.slice(0, 5);
}

/**
 * Sanitize the generated name to ensure it's a valid kebab-case folder name.
 */
function sanitizeGeneratedName(name: string): string | null {
  // Remove any leading/trailing whitespace and quotes
  let sanitized = name.trim().replace(/^["']|["']$/g, '');

  // Remove any numbering prefix like "1." or "1:" or "1)"
  sanitized = sanitized.replace(/^\d+[.:)]\s*/, '');

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

// Export for testing
export { sanitizeGeneratedName };
