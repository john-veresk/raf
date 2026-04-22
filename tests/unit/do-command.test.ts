import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveProjectIdentifier, extractProjectName } from '../../src/utils/paths.js';
import { getCommitVerificationFailureReason } from '../../src/commands/do.js';

describe('Do Command - Identifier Support', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-do-cmd-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Single Project Full Folder Name Resolution', () => {
    it('should resolve project by full numeric prefix folder name: raf do 1-fix-stuff', () => {
      fs.mkdirSync(path.join(tempDir, '1-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '1-fix-stuff');
      expect(result).toBe(path.join(tempDir, '1-fix-stuff'));
    });

    it('should resolve project by full numeric folder name: raf do 7-project', () => {
      fs.mkdirSync(path.join(tempDir, '7-project'));
      const result = resolveProjectIdentifier(tempDir, '7-project');
      expect(result).toBe(path.join(tempDir, '7-project'));
    });

    it('should resolve full folder name with multi-digit numeric prefix', () => {
      fs.mkdirSync(path.join(tempDir, '42-all-letters'));
      const result = resolveProjectIdentifier(tempDir, '42-all-letters');
      expect(result).toBe(path.join(tempDir, '42-all-letters'));
    });
  });

  describe('Error Messages for Non-Matching Full Folder Names', () => {
    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '1-existing'));
      const result = resolveProjectIdentifier(tempDir, '2-non-existent');
      expect(result).toBeNull();
    });

    it('should return null when prefix exists but name differs', () => {
      fs.mkdirSync(path.join(tempDir, '1-actual-name'));
      const result = resolveProjectIdentifier(tempDir, '1-different-name');
      expect(result).toBeNull();
    });

    it('should return null when name exists but prefix differs', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      const result = resolveProjectIdentifier(tempDir, '42-my-project');
      expect(result).toBeNull();
    });

    it('should return null for non-matching full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      const result = resolveProjectIdentifier(tempDir, '7-my-project');
      expect(result).toBeNull();
    });
  });

  describe('Identifier Formats', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      fs.mkdirSync(path.join(tempDir, '2-another-project'));
      fs.mkdirSync(path.join(tempDir, '3-alpha-project'));
    });

    it('should resolve by numeric prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '1')).toBe(path.join(tempDir, '1-my-project'));
      expect(resolveProjectIdentifier(tempDir, '2')).toBe(path.join(tempDir, '2-another-project'));
    });

    it('should resolve by numeric prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '3')).toBe(path.join(tempDir, '3-alpha-project'));
    });

    it('should resolve by project name', () => {
      expect(resolveProjectIdentifier(tempDir, 'my-project')).toBe(path.join(tempDir, '1-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'another-project')).toBe(path.join(tempDir, '2-another-project'));
      expect(resolveProjectIdentifier(tempDir, 'alpha-project')).toBe(path.join(tempDir, '3-alpha-project'));
    });
  });

  describe('Project Name Extraction with Full Folder Names', () => {
    it('should extract name from numeric prefix folder path', () => {
      const projectPath = path.join(tempDir, '1-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract name from numeric full folder path', () => {
      const projectPath = path.join(tempDir, '7-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should handle multi-hyphen names', () => {
      const projectPath = path.join(tempDir, '1-my-cool-project-name');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-cool-project-name');
    });
  });

  describe('commit verification failure handling', () => {
    it('should explain that the required task artifact must be in the final task commit', () => {
      const reason = getCommitVerificationFailureReason([
        '/tmp/project/outcomes/1-task.md',
      ]);

      expect(reason).toContain('final task commit');
      expect(reason).toContain('1-task.md');
    });
  });
});
