import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getNextProjectNumber,
  formatProjectNumber,
  listProjects,
  extractProjectNumber,
  extractProjectName,
  extractTaskNameFromPlanFile,
  resolveProjectIdentifier,
  getDecisionsPath,
  encodeBase36,
  decodeBase36,
  isBase36Prefix,
  parseProjectPrefix,
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
      fs.mkdirSync(path.join(tempDir, 'not-a-project')); // 'not' is valid base36, but project name must follow hyphen
      fs.mkdirSync(path.join(tempDir, 'random')); // No hyphen, not a project
      fs.mkdirSync(path.join(tempDir, 'ab')); // Too short prefix

      const projects = listProjects(tempDir);
      // 'not-a-project' is now recognized as base36 project (not = 18741)
      expect(projects).toHaveLength(2);
      expect(projects[0]?.name).toBe('valid');
      expect(projects[0]?.number).toBe(1);
      expect(projects[1]?.name).toBe('a-project');
      expect(projects[1]?.number).toBe(18741); // 'not' in base36
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
      expect(extractProjectNumber('/RAF/my-project')).toBeNull(); // 'my' is only 2 chars
      expect(extractProjectNumber('')).toBeNull();
      // 'not' is a valid base36 prefix, so not-numbered returns 'not'
      expect(extractProjectNumber('/RAF/not-numbered')).toBe('not');
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectNumber('/RAF/001-my-project/')).toBe('001');
    });

    it('should only match valid prefixes at the start of folder name', () => {
      // 'abc' is a valid base36 prefix, so abc-001-project returns 'abc'
      expect(extractProjectNumber('/RAF/abc-001-project')).toBe('abc');
      // 'project' is too long for a valid prefix (must be 2-3 digits or 3 char base36)
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
      expect(extractProjectName('/RAF/my-project')).toBeNull(); // 'my' is only 2 chars
      expect(extractProjectName('')).toBeNull();
      // 'not' is a valid base36 prefix, so not-numbered extracts 'numbered' as name
      expect(extractProjectName('/RAF/not-numbered')).toBe('numbered');
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectName('/RAF/001-my-project/')).toBe('my-project');
    });

    it('should only match valid prefixes at the start of folder name', () => {
      // 'abc' is a valid base36 prefix, so abc-001-project extracts '001-project' as name
      expect(extractProjectName('/RAF/abc-001-project')).toBe('001-project');
      // 'project' is too long for a valid prefix
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

  describe('extractTaskNameFromPlanFile', () => {
    it('should extract task name from 3-digit numbered plan file', () => {
      expect(extractTaskNameFromPlanFile('001-fix-login-bug.md')).toBe('fix-login-bug');
      expect(extractTaskNameFromPlanFile('123-add-feature.md')).toBe('add-feature');
    });

    it('should extract task name from 2-digit numbered plan file', () => {
      expect(extractTaskNameFromPlanFile('01-first-task.md')).toBe('first-task');
      expect(extractTaskNameFromPlanFile('99-last-task.md')).toBe('last-task');
    });

    it('should return null for invalid filenames', () => {
      expect(extractTaskNameFromPlanFile('my-task.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('not-numbered.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('')).toBeNull();
    });

    it('should handle task names with hyphens', () => {
      expect(extractTaskNameFromPlanFile('001-my-complex-task-name.md')).toBe('my-complex-task-name');
    });

    it('should handle task names with numbers', () => {
      expect(extractTaskNameFromPlanFile('001-task-v2.md')).toBe('task-v2');
      expect(extractTaskNameFromPlanFile('001-123-test.md')).toBe('123-test');
    });

    it('should handle full paths', () => {
      expect(extractTaskNameFromPlanFile('/path/to/plans/002-fix-login-bug.md')).toBe('fix-login-bug');
    });

    it('should handle files without .md extension', () => {
      expect(extractTaskNameFromPlanFile('001-task-name')).toBe('task-name');
    });
  });

  describe('resolveProjectIdentifier', () => {
    it('should resolve project by exact number (3 digits)', () => {
      fs.mkdirSync(path.join(tempDir, '003-my-project'));
      const result = resolveProjectIdentifier(tempDir, '003');
      expect(result).toBe(path.join(tempDir, '003-my-project'));
    });

    it('should resolve project by number without leading zeros', () => {
      fs.mkdirSync(path.join(tempDir, '003-my-project'));
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '003-my-project'));
    });

    it('should resolve project by 2-digit number', () => {
      fs.mkdirSync(path.join(tempDir, '42-my-project'));
      const result = resolveProjectIdentifier(tempDir, '42');
      expect(result).toBe(path.join(tempDir, '42-my-project'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '005-my-awesome-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-awesome-project');
      expect(result).toBe(path.join(tempDir, '005-my-awesome-project'));
    });

    it('should return null for non-existent project number', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      const result = resolveProjectIdentifier(tempDir, '999');
      expect(result).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const result = resolveProjectIdentifier('/non/existent/path', '001');
      expect(result).toBeNull();
    });

    it('should handle multiple projects and find correct one by number', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, '002-second'));
      fs.mkdirSync(path.join(tempDir, '003-third'));

      expect(resolveProjectIdentifier(tempDir, '1')).toBe(path.join(tempDir, '001-first'));
      expect(resolveProjectIdentifier(tempDir, '2')).toBe(path.join(tempDir, '002-second'));
      expect(resolveProjectIdentifier(tempDir, '003')).toBe(path.join(tempDir, '003-third'));
    });

    it('should handle multiple projects and find correct one by name', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, '002-second'));
      fs.mkdirSync(path.join(tempDir, '003-third'));

      expect(resolveProjectIdentifier(tempDir, 'first')).toBe(path.join(tempDir, '001-first'));
      expect(resolveProjectIdentifier(tempDir, 'second')).toBe(path.join(tempDir, '002-second'));
      expect(resolveProjectIdentifier(tempDir, 'third')).toBe(path.join(tempDir, '003-third'));
    });

    it('should not resolve partial name match', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'my')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'project')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'my-proj')).toBeNull();
    });

    it('should prefer number match when identifier is numeric', () => {
      fs.mkdirSync(path.join(tempDir, '005-project'));
      // Numeric identifier "5" should match project number 5
      const result = resolveProjectIdentifier(tempDir, '5');
      expect(result).toBe(path.join(tempDir, '005-project'));
    });
  });

  describe('getDecisionsPath', () => {
    it('should return decisions.md at project root', () => {
      const projectPath = '/Users/foo/RAF/001-my-project';
      expect(getDecisionsPath(projectPath)).toBe(path.join(projectPath, 'decisions.md'));
    });
  });

  // Base36 project numbering tests
  describe('encodeBase36', () => {
    it('should encode 1000 as a00', () => {
      expect(encodeBase36(1000)).toBe('a00');
    });

    it('should encode 1001 as a01', () => {
      expect(encodeBase36(1001)).toBe('a01');
    });

    it('should encode 1035 as a0z', () => {
      expect(encodeBase36(1035)).toBe('a0z');
    });

    it('should encode 1036 as a10', () => {
      expect(encodeBase36(1036)).toBe('a10');
    });

    it('should encode 2296 as b00 (1000 + 1296)', () => {
      // 1296 = 36 * 36, so b00 = 1000 + 1296 = 2296
      expect(encodeBase36(2296)).toBe('b00');
    });

    it('should encode larger numbers correctly', () => {
      // c00 = 1000 + 2*1296 = 1000 + 2592 = 3592
      expect(encodeBase36(3592)).toBe('c00');
    });

    it('should throw for numbers less than 1000', () => {
      expect(() => encodeBase36(999)).toThrow();
      expect(() => encodeBase36(0)).toThrow();
      expect(() => encodeBase36(500)).toThrow();
    });

    it('should handle boundary between digits', () => {
      // a0z = 1035, a10 = 1036
      expect(encodeBase36(1035)).toBe('a0z');
      expect(encodeBase36(1036)).toBe('a10');
      // azz = 1000 + 35*36 + 35 = 1000 + 1260 + 35 = 2295
      expect(encodeBase36(2295)).toBe('azz');
    });
  });

  describe('decodeBase36', () => {
    it('should decode a00 as 1000', () => {
      expect(decodeBase36('a00')).toBe(1000);
    });

    it('should decode a01 as 1001', () => {
      expect(decodeBase36('a01')).toBe(1001);
    });

    it('should decode a0z as 1035', () => {
      expect(decodeBase36('a0z')).toBe(1035);
    });

    it('should decode a10 as 1036', () => {
      expect(decodeBase36('a10')).toBe(1036);
    });

    it('should decode b00 as 2296', () => {
      expect(decodeBase36('b00')).toBe(2296);
    });

    it('should return null for invalid format', () => {
      expect(decodeBase36('001')).toBeNull(); // Starts with digit
      expect(decodeBase36('1a0')).toBeNull(); // Starts with digit
      expect(decodeBase36('ab')).toBeNull(); // Too short
      expect(decodeBase36('abcd')).toBeNull(); // Too long
      expect(decodeBase36('')).toBeNull(); // Empty
    });

    it('should handle uppercase input', () => {
      expect(decodeBase36('A00')).toBe(1000);
      expect(decodeBase36('B00')).toBe(2296);
    });

    it('should be inverse of encodeBase36', () => {
      for (const num of [1000, 1001, 1035, 1036, 2000, 2296, 5000, 10000]) {
        expect(decodeBase36(encodeBase36(num))).toBe(num);
      }
    });
  });

  describe('isBase36Prefix', () => {
    it('should return true for valid base36 prefixes', () => {
      expect(isBase36Prefix('a00')).toBe(true);
      expect(isBase36Prefix('a01')).toBe(true);
      expect(isBase36Prefix('azz')).toBe(true);
      expect(isBase36Prefix('b00')).toBe(true);
      expect(isBase36Prefix('z99')).toBe(true);
      expect(isBase36Prefix('zzz')).toBe(true);
    });

    it('should return false for numeric prefixes', () => {
      expect(isBase36Prefix('001')).toBe(false);
      expect(isBase36Prefix('999')).toBe(false);
      expect(isBase36Prefix('123')).toBe(false);
    });

    it('should return false for invalid formats', () => {
      expect(isBase36Prefix('ab')).toBe(false); // Too short
      expect(isBase36Prefix('abcd')).toBe(false); // Too long
      expect(isBase36Prefix('1ab')).toBe(false); // Starts with digit
      expect(isBase36Prefix('')).toBe(false); // Empty
    });

    it('should handle uppercase', () => {
      expect(isBase36Prefix('A00')).toBe(true);
      expect(isBase36Prefix('ABC')).toBe(true);
    });
  });

  describe('parseProjectPrefix', () => {
    it('should parse numeric prefixes', () => {
      expect(parseProjectPrefix('001')).toBe(1);
      expect(parseProjectPrefix('123')).toBe(123);
      expect(parseProjectPrefix('999')).toBe(999);
      expect(parseProjectPrefix('01')).toBe(1);
      expect(parseProjectPrefix('99')).toBe(99);
    });

    it('should parse base36 prefixes', () => {
      expect(parseProjectPrefix('a00')).toBe(1000);
      expect(parseProjectPrefix('a01')).toBe(1001);
      expect(parseProjectPrefix('b00')).toBe(2296);
    });

    it('should return null for invalid prefixes', () => {
      expect(parseProjectPrefix('abc-')).toBeNull();
      expect(parseProjectPrefix('1')).toBeNull(); // Too short
      expect(parseProjectPrefix('1234')).toBeNull(); // Too long for numeric
      expect(parseProjectPrefix('')).toBeNull();
    });
  });

  describe('formatProjectNumber (base36)', () => {
    it('should use numeric format for numbers 1-999', () => {
      expect(formatProjectNumber(1)).toBe('001');
      expect(formatProjectNumber(999)).toBe('999');
      expect(formatProjectNumber(500)).toBe('500');
    });

    it('should use base36 format for numbers >= 1000', () => {
      expect(formatProjectNumber(1000)).toBe('a00');
      expect(formatProjectNumber(1001)).toBe('a01');
      expect(formatProjectNumber(2296)).toBe('b00');
    });

    it('should correctly format transition from 999 to 1000', () => {
      expect(formatProjectNumber(999)).toBe('999');
      expect(formatProjectNumber(1000)).toBe('a00');
    });
  });

  describe('extractProjectNumber (base36)', () => {
    it('should extract base36 project number from path', () => {
      expect(extractProjectNumber('/RAF/a00-my-project')).toBe('a00');
      expect(extractProjectNumber('/RAF/a01-another-project')).toBe('a01');
      expect(extractProjectNumber('/RAF/b00-third-project')).toBe('b00');
    });

    it('should handle uppercase base36 prefixes', () => {
      expect(extractProjectNumber('/RAF/A00-my-project')).toBe('a00');
    });

    it('should prefer numeric format when ambiguous', () => {
      // Numeric should be matched first
      expect(extractProjectNumber('/RAF/001-my-project')).toBe('001');
    });
  });

  describe('extractProjectName (base36)', () => {
    it('should extract project name from base36 numbered path', () => {
      expect(extractProjectName('/RAF/a00-my-project')).toBe('my-project');
      expect(extractProjectName('/RAF/b00-another-project')).toBe('another-project');
    });

    it('should handle uppercase base36 prefixes', () => {
      expect(extractProjectName('/RAF/A00-my-project')).toBe('my-project');
    });
  });

  describe('getNextProjectNumber (base36)', () => {
    it('should return next number after base36 projects', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-project1000'));
      expect(getNextProjectNumber(tempDir)).toBe(1001);
    });

    it('should handle mixed numeric and base36 projects', () => {
      fs.mkdirSync(path.join(tempDir, '999-last-numeric'));
      fs.mkdirSync(path.join(tempDir, 'a00-first-base36'));
      expect(getNextProjectNumber(tempDir)).toBe(1001);
    });

    it('should find max across mixed formats', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, 'a05-middle'));
      fs.mkdirSync(path.join(tempDir, '500-later'));
      // a05 = 1005, which is the max
      expect(getNextProjectNumber(tempDir)).toBe(1006);
    });
  });

  describe('listProjects (base36)', () => {
    it('should list base36 projects with correct number', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-project1000'));
      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(1);
      expect(projects[0]?.number).toBe(1000);
      expect(projects[0]?.name).toBe('project1000');
    });

    it('should sort mixed numeric and base36 projects correctly', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-project1000'));
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, '999-last-numeric'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(3);
      expect(projects[0]?.number).toBe(1);
      expect(projects[1]?.number).toBe(999);
      expect(projects[2]?.number).toBe(1000);
    });
  });

  describe('resolveProjectIdentifier (base36)', () => {
    it('should resolve base36 project by prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'a00');
      expect(result).toBe(path.join(tempDir, 'a00-my-project'));
    });

    it('should resolve base36 project by numeric value', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-my-project'));
      const result = resolveProjectIdentifier(tempDir, '1000');
      expect(result).toBe(path.join(tempDir, 'a00-my-project'));
    });

    it('should resolve base36 project by name', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, 'a00-my-project'));
    });

    it('should handle mixed projects correctly', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, 'a00-second'));

      expect(resolveProjectIdentifier(tempDir, '1')).toBe(path.join(tempDir, '001-first'));
      expect(resolveProjectIdentifier(tempDir, '1000')).toBe(path.join(tempDir, 'a00-second'));
      expect(resolveProjectIdentifier(tempDir, 'a00')).toBe(path.join(tempDir, 'a00-second'));
      expect(resolveProjectIdentifier(tempDir, 'first')).toBe(path.join(tempDir, '001-first'));
      expect(resolveProjectIdentifier(tempDir, 'second')).toBe(path.join(tempDir, 'a00-second'));
    });
  });
});
