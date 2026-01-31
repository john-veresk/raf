import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as pty from 'node-pty';

// For testing: allow direct import of @inquirer/prompts functions
let directSelect: typeof import('@inquirer/prompts').select | null = null;
let directInput: typeof import('@inquirer/prompts').input | null = null;

const OTHER_OPTION_VALUE = '__OTHER__';

/**
 * Enable direct mode for testing (bypasses subprocess).
 * This should only be called in test setup.
 */
export async function enableDirectMode(): Promise<void> {
  const inquirer = await import('@inquirer/prompts');
  directSelect = inquirer.select;
  directInput = inquirer.input;
}

/**
 * Disable direct mode (use subprocess).
 */
export function disableDirectMode(): void {
  directSelect = null;
  directInput = null;
}

/**
 * Display an interactive name picker with arrow-key navigation.
 * Runs in a PTY subprocess to completely isolate @inquirer/prompts
 * stdin manipulation from the main process.
 *
 * @param names - Array of generated name suggestions (3-5 names)
 * @returns The selected or custom project name
 */
export async function pickProjectName(names: string[]): Promise<string> {
  // Use direct mode if enabled (for testing)
  if (directSelect) {
    return pickProjectNameDirect(names);
  }

  // Get path to the subprocess script
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  // Use the compiled js file
  const subprocessScript = path.join(currentDir, 'name-picker-subprocess.js');

  // Create temp file for result
  const tempFile = path.join(os.tmpdir(), `raf-name-picker-${process.pid}.txt`);

  return new Promise((resolve, reject) => {
    // Spawn subprocess in its own PTY (completely isolates stdin)
    const ptyProcess = pty.spawn('node', [subprocessScript, JSON.stringify(names), tempFile], {
      name: 'xterm-256color',
      cols: process.stdout.columns ?? 80,
      rows: process.stdout.rows ?? 24,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });

    // Set raw mode on our stdin to pass through keypresses
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    // Forward input from our stdin to the PTY
    const onData = (data: Buffer): void => {
      ptyProcess.write(data.toString());
    };
    process.stdin.on('data', onData);

    // Forward output from PTY to our stdout
    ptyProcess.onData((data) => {
      process.stdout.write(data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      // Cleanup stdin
      process.stdin.off('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();

      if (exitCode === 130) {
        // SIGINT - user cancelled
        process.exit(130);
      }

      if (exitCode !== 0) {
        // Clean up temp file
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch {
          // Ignore
        }
        reject(new Error(`Name picker subprocess failed with code ${exitCode}`));
        return;
      }

      // Read the result from temp file
      try {
        if (!fs.existsSync(tempFile)) {
          reject(new Error('Name picker did not write a selection'));
          return;
        }

        const selectedName = fs.readFileSync(tempFile, 'utf-8').trim();

        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // Ignore
        }

        if (!selectedName) {
          reject(new Error('Name picker returned empty selection'));
          return;
        }

        resolve(selectedName);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Direct implementation for testing (uses @inquirer/prompts in-process).
 */
async function pickProjectNameDirect(names: string[]): Promise<string> {
  if (!directSelect || !directInput) {
    throw new Error('Direct mode not enabled');
  }

  if (names.length === 0) {
    return promptForCustomNameDirect();
  }

  const choices = [
    ...names.map((name) => ({
      name: name,
      value: name,
    })),
    {
      name: 'Other (enter custom name)',
      value: OTHER_OPTION_VALUE,
    },
  ];

  const selected = await directSelect({
    message: 'Select a project name:',
    choices,
  });

  if (selected === OTHER_OPTION_VALUE) {
    return promptForCustomNameDirect();
  }

  return selected;
}

/**
 * Prompt user to enter a custom project name (direct mode).
 */
async function promptForCustomNameDirect(): Promise<string> {
  if (!directInput) {
    throw new Error('Direct mode not enabled');
  }

  const customName = await directInput({
    message: 'Enter project name:',
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Project name cannot be empty';
      }
      if (trimmed.length > 50) {
        return 'Project name must be 50 characters or less';
      }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(trimmed)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
      }
      return true;
    },
  });

  return customName.trim().toLowerCase();
}
