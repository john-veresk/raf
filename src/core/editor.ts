import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getEditor } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Open the user's preferred editor and return the content they wrote.
 */
export async function openEditor(initialContent: string = ''): Promise<string> {
  const editor = getEditor();
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `raf-input-${Date.now()}.md`);

  // Write initial content if any
  fs.writeFileSync(tempFile, initialContent);

  logger.debug(`Opening editor: ${editor} ${tempFile}`);

  return new Promise((resolve, reject) => {
    const editorProcess = spawn(editor, [tempFile], {
      stdio: 'inherit',
      shell: true,
    });

    editorProcess.on('error', (error) => {
      fs.unlinkSync(tempFile);
      reject(new Error(`Failed to open editor: ${error.message}`));
    });

    editorProcess.on('exit', (code) => {
      if (code !== 0) {
        fs.unlinkSync(tempFile);
        reject(new Error(`Editor exited with code ${code}`));
        return;
      }

      try {
        const content = fs.readFileSync(tempFile, 'utf-8');
        fs.unlinkSync(tempFile);
        resolve(content);
      } catch (error) {
        reject(new Error(`Failed to read editor content: ${error}`));
      }
    });
  });
}

/**
 * Prompt template for new project input.
 */
export function getInputTemplate(): string {
  return `# Project Description

<!--
Describe your project here. Be as detailed as possible.
Claude will analyze this and break it down into tasks.

Example:
- What features do you want to build?
- What technologies should be used?
- Any specific requirements or constraints?
-->


`;
}
