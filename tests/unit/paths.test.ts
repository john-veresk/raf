import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getNextProjectNumber,
  formatProjectNumber,
  listProjects,
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
});
