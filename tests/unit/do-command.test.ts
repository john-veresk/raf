import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveProjectIdentifier, extractProjectName } from '../../src/utils/paths.js';

describe('Do Command - Identifier Support', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-do-cmd-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Single Project Full Folder Name Resolution', () => {
    it('should resolve project by full 6-char prefix folder name: raf do aaaaab-fix-stuff', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-fix-stuff');
      expect(result).toBe(path.join(tempDir, 'aaaaab-fix-stuff'));
    });

    it('should resolve project by full base26 folder name: raf do abcdef-project', () => {
      fs.mkdirSync(path.join(tempDir, 'abcdef-project'));
      const result = resolveProjectIdentifier(tempDir, 'abcdef-project');
      expect(result).toBe(path.join(tempDir, 'abcdef-project'));
    });

    it('should resolve full folder name with all-numeric prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaadt-all-letters'));
      const result = resolveProjectIdentifier(tempDir, 'aaaadt-all-letters');
      expect(result).toBe(path.join(tempDir, 'aaaadt-all-letters'));
    });
  });

  describe('Error Messages for Non-Matching Full Folder Names', () => {
    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaac-non-existent');
      expect(result).toBeNull();
    });

    it('should return null when prefix exists but name differs', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-actual-name'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-different-name');
      expect(result).toBeNull();
    });

    it('should return null when name exists but prefix differs', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaabmm-my-project');
      expect(result).toBeNull();
    });

    it('should return null for non-matching full folder name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'abcdef-my-project');
      expect(result).toBeNull();
    });
  });

  describe('Identifier Formats', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-another-project'));
      fs.mkdirSync(path.join(tempDir, 'ghijkl-alpha-project'));
    });

    it('should resolve by 6-char base26 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, 'aaaaab')).toBe(path.join(tempDir, 'aaaaab-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'aaaaac')).toBe(path.join(tempDir, 'aaaaac-another-project'));
    });

    it('should resolve by base26 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, 'ghijkl')).toBe(path.join(tempDir, 'ghijkl-alpha-project'));
    });

    it('should resolve by project name', () => {
      expect(resolveProjectIdentifier(tempDir, 'my-project')).toBe(path.join(tempDir, 'aaaaab-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'another-project')).toBe(path.join(tempDir, 'aaaaac-another-project'));
      expect(resolveProjectIdentifier(tempDir, 'alpha-project')).toBe(path.join(tempDir, 'ghijkl-alpha-project'));
    });
  });

  describe('Project Name Extraction with Full Folder Names', () => {
    it('should extract name from 6-char prefix folder path', () => {
      const projectPath = path.join(tempDir, 'aaaaab-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract name from base26 full folder path', () => {
      const projectPath = path.join(tempDir, 'abcdef-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should handle multi-hyphen names', () => {
      const projectPath = path.join(tempDir, 'aaaaab-my-cool-project-name');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-cool-project-name');
    });
  });
});
