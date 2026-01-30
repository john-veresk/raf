import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveProjectIdentifier, extractProjectName } from '../../src/utils/paths.js';

describe('Status Command - Identifier Support', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Identifier Resolution for Status', () => {
    it('should resolve project by numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '003-fix-bug'));
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '003-fix-bug'));
    });

    it('should resolve project by zero-padded numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '003-fix-bug'));
      const result = resolveProjectIdentifier(tempDir, '003');
      expect(result).toBe(path.join(tempDir, '003-fix-bug'));
    });

    it('should resolve project by base36 ID', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-large-project'));
      const result = resolveProjectIdentifier(tempDir, 'a00');
      expect(result).toBe(path.join(tempDir, 'a00-large-project'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '001-my-project'));
    });

    it('should resolve project by full numeric folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '001-fix-stuff'));
    });

    it('should resolve project by full base36 folder name', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-important'));
      const result = resolveProjectIdentifier(tempDir, 'a00-important');
      expect(result).toBe(path.join(tempDir, 'a00-important'));
    });

    it('should return null for invalid identifier', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching for full folder names', () => {
      fs.mkdirSync(path.join(tempDir, 'A01-My-Project'));
      const result = resolveProjectIdentifier(tempDir, 'a01-my-project');
      expect(result).toBe(path.join(tempDir, 'A01-My-Project'));
    });
  });

  describe('Project Name Extraction', () => {
    it('should extract project name from numeric folder', () => {
      const projectPath = path.join(tempDir, '001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract project name from base36 folder', () => {
      const projectPath = path.join(tempDir, 'a00-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });
  });

  describe('All Identifier Formats Work', () => {
    beforeEach(() => {
      // Create a numeric project
      fs.mkdirSync(path.join(tempDir, '003-numeric-project'));
      // Create a base36 project
      fs.mkdirSync(path.join(tempDir, 'a01-base36-project'));
    });

    it('should work with number without leading zeros', () => {
      expect(resolveProjectIdentifier(tempDir, '3')).toBe(path.join(tempDir, '003-numeric-project'));
    });

    it('should work with number with leading zeros', () => {
      expect(resolveProjectIdentifier(tempDir, '003')).toBe(path.join(tempDir, '003-numeric-project'));
    });

    it('should work with base36 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, 'a01')).toBe(path.join(tempDir, 'a01-base36-project'));
    });

    it('should work with project name for numeric project', () => {
      expect(resolveProjectIdentifier(tempDir, 'numeric-project')).toBe(path.join(tempDir, '003-numeric-project'));
    });

    it('should work with project name for base36 project', () => {
      expect(resolveProjectIdentifier(tempDir, 'base36-project')).toBe(path.join(tempDir, 'a01-base36-project'));
    });

    it('should work with full numeric folder name', () => {
      expect(resolveProjectIdentifier(tempDir, '003-numeric-project')).toBe(path.join(tempDir, '003-numeric-project'));
    });

    it('should work with full base36 folder name', () => {
      expect(resolveProjectIdentifier(tempDir, 'a01-base36-project')).toBe(path.join(tempDir, 'a01-base36-project'));
    });

    it('should work with numeric value of base36 project', () => {
      // a01 = 1001 in base36 encoding
      expect(resolveProjectIdentifier(tempDir, '1001')).toBe(path.join(tempDir, 'a01-base36-project'));
    });
  });

  describe('Error Cases', () => {
    it('should return null for non-existent numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '001-project'));
      expect(resolveProjectIdentifier(tempDir, '999')).toBeNull();
    });

    it('should return null for non-existent base36 ID', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-project'));
      expect(resolveProjectIdentifier(tempDir, 'b00')).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'other-project')).toBeNull();
    });

    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, '002-my-project')).toBeNull();
    });

    it('should return null for empty RAF directory', () => {
      expect(resolveProjectIdentifier(tempDir, '001')).toBeNull();
    });

    it('should return null for non-existent RAF directory', () => {
      expect(resolveProjectIdentifier('/non/existent/path', '001')).toBeNull();
    });
  });
});
