/**
 * Status line utility for displaying in-place updates during task execution.
 * Uses carriage return to update the line without scrolling.
 */

export interface StatusLine {
  update: (text: string) => void;
  clear: () => void;
}

/**
 * Creates a status line that can be updated in-place.
 * The status line is cleared before any new content is written.
 */
export function createStatusLine(): StatusLine {
  let lastLength = 0;
  let isActive = false;

  return {
    update(text: string): void {
      // Only write to TTY
      if (!process.stdout.isTTY) {
        return;
      }

      isActive = true;
      // Clear the previous line content and write new content
      const clearStr = ' '.repeat(lastLength);
      process.stdout.write(`\r${clearStr}\r${text}`);
      lastLength = text.length;
    },

    clear(): void {
      if (!process.stdout.isTTY || !isActive) {
        return;
      }

      // Clear the line and reset cursor
      const clearStr = ' '.repeat(lastLength);
      process.stdout.write(`\r${clearStr}\r`);
      lastLength = 0;
      isActive = false;
    },
  };
}
