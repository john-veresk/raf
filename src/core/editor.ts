import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getEditor } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Escape a file path for shell usage.
 */
function escapeShellPath(filePath: string): string {
  // Use single quotes and escape any existing single quotes
  return `'${filePath.replace(/'/g, "'\\''")}'`;
}

/**
 * Open the user's preferred editor and return the content they wrote.
 */
export async function openEditor(initialContent: string = ''): Promise<string> {
  const editor = getEditor();
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `raf-input-${Date.now()}.md`);

  // Write initial content if any
  fs.writeFileSync(tempFile, initialContent);

  // Build shell command with properly escaped file path
  // This handles editors like "code --wait" or "vim" uniformly
  const shellCommand = `${editor} ${escapeShellPath(tempFile)}`;
  logger.debug(`Opening editor: ${shellCommand}`);

  return new Promise((resolve, reject) => {
    // Use shell: true with the full command as a single string
    // This correctly handles editors with arguments (e.g., "code --wait")
    const editorProcess = spawn(shellCommand, [], {
      stdio: 'inherit',
      shell: true,
    });

    editorProcess.on('error', (error) => {
      cleanupTempFile(tempFile);
      reject(new Error(`Failed to open editor: ${error.message}`));
    });

    editorProcess.on('exit', (code) => {
      // Read the file content regardless of exit code
      // Many editors (vim included) may exit with non-zero for various benign reasons
      try {
        const content = fs.readFileSync(tempFile, 'utf-8');
        cleanupTempFile(tempFile);

        // Only treat as error if file is empty/unchanged AND exit code is non-zero
        // This distinguishes between "user cancelled" and "editor failed"
        if (code !== 0 && content === initialContent) {
          reject(new Error(`Editor exited with code ${code}`));
          return;
        }

        resolve(content);
      } catch (error) {
        cleanupTempFile(tempFile);
        reject(new Error(`Failed to read editor content: ${error}`));
      }
    });
  });
}

/**
 * Safely remove temp file, ignoring errors if file doesn't exist.
 */
function cleanupTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore errors - file may already be deleted
  }
}

/**
 * Returns initial content for the project description editor.
 * Opens with an empty file for a clean user experience.
 */
export function getInputTemplate(): string {
  return '';
}
