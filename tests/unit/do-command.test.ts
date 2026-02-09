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
    it('should resolve project by full 6-char prefix folder name: raf do 000001-fix-stuff', () => {
      fs.mkdirSync(path.join(tempDir, '000001-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '000001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '000001-fix-stuff'));
    });

    it('should resolve project by full base36 folder name: raf do 00a001-project', () => {
      fs.mkdirSync(path.join(tempDir, '00a001-project'));
      const result = resolveProjectIdentifier(tempDir, '00a001-project');
      expect(result).toBe(path.join(tempDir, '00a001-project'));
    });

    it('should resolve full folder name with all-numeric prefix', () => {
      fs.mkdirSync(path.join(tempDir, '000123-three-digits'));
      const result = resolveProjectIdentifier(tempDir, '000123-three-digits');
      expect(result).toBe(path.join(tempDir, '000123-three-digits'));
    });
  });

  describe('Error Messages for Non-Matching Full Folder Names', () => {
    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-existing'));
      const result = resolveProjectIdentifier(tempDir, '000002-non-existent');
      expect(result).toBeNull();
    });

    it('should return null when prefix exists but name differs', () => {
      fs.mkdirSync(path.join(tempDir, '000001-actual-name'));
      const result = resolveProjectIdentifier(tempDir, '000001-different-name');
      expect(result).toBeNull();
    });

    it('should return null when name exists but prefix differs', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      const result = resolveProjectIdentifier(tempDir, '0000rs-my-project');
      expect(result).toBeNull();
    });

    it('should return null for non-matching full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      const result = resolveProjectIdentifier(tempDir, '00a001-my-project');
      expect(result).toBeNull();
    });
  });

  describe('Identifier Formats', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      fs.mkdirSync(path.join(tempDir, '000002-another-project'));
      fs.mkdirSync(path.join(tempDir, '00a001-base36-project'));
    });

    it('should resolve by 6-char base36 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '000001')).toBe(path.join(tempDir, '000001-my-project'));
      expect(resolveProjectIdentifier(tempDir, '000002')).toBe(path.join(tempDir, '000002-another-project'));
    });

    it('should resolve by base36 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '00a001')).toBe(path.join(tempDir, '00a001-base36-project'));
    });

    it('should resolve by project name', () => {
      expect(resolveProjectIdentifier(tempDir, 'my-project')).toBe(path.join(tempDir, '000001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'another-project')).toBe(path.join(tempDir, '000002-another-project'));
      expect(resolveProjectIdentifier(tempDir, 'base36-project')).toBe(path.join(tempDir, '00a001-base36-project'));
    });
  });

  describe('Project Name Extraction with Full Folder Names', () => {
    it('should extract name from 6-char prefix folder path', () => {
      const projectPath = path.join(tempDir, '000001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract name from base36 full folder path', () => {
      const projectPath = path.join(tempDir, '00a001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should handle multi-hyphen names', () => {
      const projectPath = path.join(tempDir, '000001-my-cool-project-name');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-cool-project-name');
    });
  });
});
