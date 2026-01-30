import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getNextProjectNumber,
  formatProjectNumber,
  listProjects,
  extractProjectNumber,
  extractProjectName,
} from '../../src/utils/paths.js';

describe('Paths', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getNextProjectNumber', () => {
    it('should return 1 for empty directory', () => {
      expect(getNextProjectNumber(tempDir)).toBe(1);
    });

    it('should return 1 for non-existent directory', () => {
      expect(getNextProjectNumber('/non/existent/path')).toBe(1);
    });

    it('should return next number after existing projects', () => {
      fs.mkdirSync(path.join(tempDir, '01-first'));
      fs.mkdirSync(path.join(tempDir, '02-second'));

      expect(getNextProjectNumber(tempDir)).toBe(3);
    });

    it('should handle gaps in numbering', () => {
      fs.mkdirSync(path.join(tempDir, '01-first'));
      fs.mkdirSync(path.join(tempDir, '05-fifth'));

      expect(getNextProjectNumber(tempDir)).toBe(6);
    });
  });

  describe('formatProjectNumber', () => {
    it('should pad single digits to 3 digits', () => {
      expect(formatProjectNumber(1)).toBe('001');
      expect(formatProjectNumber(9)).toBe('009');
    });

    it('should pad double digits to 3 digits', () => {
      expect(formatProjectNumber(10)).toBe('010');
      expect(formatProjectNumber(99)).toBe('099');
    });

    it('should not pad triple digits', () => {
      expect(formatProjectNumber(100)).toBe('100');
      expect(formatProjectNumber(999)).toBe('999');
    });
  });

  describe('listProjects', () => {
    it('should list projects in order', () => {
      fs.mkdirSync(path.join(tempDir, '02-second'));
      fs.mkdirSync(path.join(tempDir, '01-first'));
      fs.mkdirSync(path.join(tempDir, '03-third'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(3);
      expect(projects[0]?.name).toBe('first');
      expect(projects[1]?.name).toBe('second');
      expect(projects[2]?.name).toBe('third');
    });

    it('should ignore non-project directories', () => {
      fs.mkdirSync(path.join(tempDir, '01-valid'));
      fs.mkdirSync(path.join(tempDir, 'not-a-project'));
      fs.mkdirSync(path.join(tempDir, 'random'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('valid');
    });

    it('should return empty array for non-existent directory', () => {
      const projects = listProjects('/non/existent/path');
      expect(projects).toEqual([]);
    });
  });

  describe('extractProjectNumber', () => {
    it('should extract 3-digit project number from path', () => {
      expect(extractProjectNumber('/Users/foo/RAF/001-my-project')).toBe('001');
      expect(extractProjectNumber('/RAF/123-another-project')).toBe('123');
    });

    it('should extract 2-digit project number from path', () => {
      expect(extractProjectNumber('/RAF/01-first')).toBe('01');
      expect(extractProjectNumber('/RAF/99-last')).toBe('99');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectNumber('/RAF/my-project')).toBeNull();
      expect(extractProjectNumber('/RAF/not-numbered')).toBeNull();
      expect(extractProjectNumber('')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectNumber('/RAF/001-my-project/')).toBe('001');
    });

    it('should only match numbers at the start of folder name', () => {
      expect(extractProjectNumber('/RAF/abc-001-project')).toBeNull();
      expect(extractProjectNumber('/RAF/project-001')).toBeNull();
    });
  });

  describe('extractProjectName', () => {
    it('should extract project name from 3-digit numbered path', () => {
      expect(extractProjectName('/Users/foo/RAF/001-my-project')).toBe('my-project');
      expect(extractProjectName('/RAF/123-another-project')).toBe('another-project');
    });

    it('should extract project name from 2-digit numbered path', () => {
      expect(extractProjectName('/RAF/01-first')).toBe('first');
      expect(extractProjectName('/RAF/99-last')).toBe('last');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectName('/RAF/my-project')).toBeNull();
      expect(extractProjectName('/RAF/not-numbered')).toBeNull();
      expect(extractProjectName('')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectName('/RAF/001-my-project/')).toBe('my-project');
    });

    it('should only match numbers at the start of folder name', () => {
      expect(extractProjectName('/RAF/abc-001-project')).toBeNull();
      expect(extractProjectName('/RAF/project-001')).toBeNull();
    });

    it('should handle project names with hyphens', () => {
      expect(extractProjectName('/RAF/001-my-complex-project-name')).toBe('my-complex-project-name');
    });

    it('should handle project names with numbers', () => {
      expect(extractProjectName('/RAF/001-project-v2')).toBe('project-v2');
      expect(extractProjectName('/RAF/001-123-test')).toBe('123-test');
    });
  });
});
