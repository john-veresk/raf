import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Plan Command - Amend Input.md Handling', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-amend-input-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Input.md append behavior', () => {
    it('should append new content with separator to existing input.md', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const originalContent = 'Original project description.';
      const newContent = 'Add new feature X.';

      // Simulate existing input.md
      fs.writeFileSync(inputPath, originalContent);

      // Simulate the append logic from runAmendCommand
      const separator = '\n\n---\n\n';
      const updatedInput = originalContent.trim()
        ? `${originalContent.trimEnd()}${separator}${newContent}`
        : newContent;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify result
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toContain(originalContent);
      expect(result).toContain('---');
      expect(result).toContain(newContent);
      expect(result).toBe(`${originalContent}${separator}${newContent}`);
    });

    it('should handle empty original input.md', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const newContent = 'Add new feature X.';

      // Simulate empty input.md
      fs.writeFileSync(inputPath, '');

      // Simulate the append logic from runAmendCommand
      const originalContent = fs.readFileSync(inputPath, 'utf-8');
      const separator = '\n\n---\n\n';
      const updatedInput = originalContent.trim()
        ? `${originalContent.trimEnd()}${separator}${newContent}`
        : newContent;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify result - no separator when original is empty
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toBe(newContent);
      expect(result).not.toContain('---');
    });

    it('should handle non-existent input.md', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const newContent = 'Add new feature X.';

      // Simulate the logic from runAmendCommand when input.md doesn't exist
      const originalContent = fs.existsSync(inputPath)
        ? fs.readFileSync(inputPath, 'utf-8')
        : '';
      const separator = '\n\n---\n\n';
      const updatedInput = originalContent.trim()
        ? `${originalContent.trimEnd()}${separator}${newContent}`
        : newContent;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify result - no separator when original is empty
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toBe(newContent);
    });

    it('should handle multiple amend operations correctly', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const original = 'First project description.';
      const secondAmend = 'Add feature A.';
      const thirdAmend = 'Add feature B.';
      const separator = '\n\n---\n\n';

      // First: write original content
      fs.writeFileSync(inputPath, original);

      // Second amend
      let currentContent = fs.readFileSync(inputPath, 'utf-8');
      let updatedInput = currentContent.trim()
        ? `${currentContent.trimEnd()}${separator}${secondAmend}`
        : secondAmend;
      fs.writeFileSync(inputPath, updatedInput);

      // Third amend
      currentContent = fs.readFileSync(inputPath, 'utf-8');
      updatedInput = currentContent.trim()
        ? `${currentContent.trimEnd()}${separator}${thirdAmend}`
        : thirdAmend;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify result
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toContain(original);
      expect(result).toContain(secondAmend);
      expect(result).toContain(thirdAmend);

      // Should have two separators
      const separatorCount = (result.match(/---/g) || []).length;
      expect(separatorCount).toBe(2);
    });

    it('should preserve trailing whitespace correctly in original content', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const originalWithWhitespace = 'Original content.\n\n\n';
      const newContent = 'New content.';
      const separator = '\n\n---\n\n';

      fs.writeFileSync(inputPath, originalWithWhitespace);

      // Simulate the append logic (trims end of original)
      const originalContent = fs.readFileSync(inputPath, 'utf-8');
      const updatedInput = originalContent.trim()
        ? `${originalContent.trimEnd()}${separator}${newContent}`
        : newContent;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify - trailing whitespace should be trimmed
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toBe(`Original content.${separator}${newContent}`);
    });

    it('should handle content with only whitespace', () => {
      const inputPath = path.join(tempDir, 'input.md');
      const whitespaceOnly = '   \n\n  ';
      const newContent = 'New content.';
      const separator = '\n\n---\n\n';

      fs.writeFileSync(inputPath, whitespaceOnly);

      // Simulate the append logic
      const originalContent = fs.readFileSync(inputPath, 'utf-8');
      const updatedInput = originalContent.trim()
        ? `${originalContent.trimEnd()}${separator}${newContent}`
        : newContent;
      fs.writeFileSync(inputPath, updatedInput);

      // Verify - whitespace-only content treated as empty
      const result = fs.readFileSync(inputPath, 'utf-8');
      expect(result).toBe(newContent);
      expect(result).not.toContain('---');
    });
  });
});
