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
  resolveProjectIdentifierWithDetails,
  getDecisionsPath,
  encodeBase36,
  decodeBase36,
  isBase36Prefix,
  parseProjectPrefix,
  RAF_EPOCH,
} from '../../src/utils/paths.js';

describe('Paths', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('encodeBase36', () => {
    it('should encode 0 as 000000', () => {
      expect(encodeBase36(0)).toBe('000000');
    });

    it('should encode small numbers with zero-padding', () => {
      expect(encodeBase36(1)).toBe('000001');
      expect(encodeBase36(35)).toBe('00000z');
      expect(encodeBase36(36)).toBe('000010');
    });

    it('should encode larger numbers correctly', () => {
      expect(encodeBase36(1000)).toBe('0000rs');
      expect(encodeBase36(3456000)).toBe('0222o0');
    });

    it('should throw for negative numbers', () => {
      expect(() => encodeBase36(-1)).toThrow();
      expect(() => encodeBase36(-100)).toThrow();
    });

    it('should produce 6-character strings', () => {
      for (const num of [0, 1, 100, 10000, 1000000]) {
        expect(encodeBase36(num)).toHaveLength(6);
      }
    });
  });

  describe('decodeBase36', () => {
    it('should decode 000000 as 0', () => {
      expect(decodeBase36('000000')).toBe(0);
    });

    it('should decode valid base36 strings', () => {
      expect(decodeBase36('000001')).toBe(1);
      expect(decodeBase36('00000z')).toBe(35);
      expect(decodeBase36('000010')).toBe(36);
      expect(decodeBase36('0000rs')).toBe(1000);
    });

    it('should return null for invalid format', () => {
      expect(decodeBase36('001')).toBeNull(); // Too short
      expect(decodeBase36('0000001')).toBeNull(); // Too long
      expect(decodeBase36('')).toBeNull(); // Empty
      expect(decodeBase36('abc')).toBeNull(); // Too short
    });

    it('should handle uppercase input', () => {
      expect(decodeBase36('0000RS')).toBe(1000);
      expect(decodeBase36('00000Z')).toBe(35);
    });

    it('should be inverse of encodeBase36', () => {
      for (const num of [0, 1, 35, 36, 1000, 100000, 3456000]) {
        expect(decodeBase36(encodeBase36(num))).toBe(num);
      }
    });
  });

  describe('isBase36Prefix', () => {
    it('should return true for valid 6-char base36 prefixes', () => {
      expect(isBase36Prefix('000000')).toBe(true);
      expect(isBase36Prefix('00abc0')).toBe(true);
      expect(isBase36Prefix('zzzzzz')).toBe(true);
      expect(isBase36Prefix('0000rs')).toBe(true);
    });

    it('should return false for wrong-length strings', () => {
      expect(isBase36Prefix('abc')).toBe(false); // Too short
      expect(isBase36Prefix('0000000')).toBe(false); // Too long
      expect(isBase36Prefix('')).toBe(false); // Empty
      expect(isBase36Prefix('001')).toBe(false); // Too short
    });

    it('should handle uppercase', () => {
      expect(isBase36Prefix('00ABC0')).toBe(true);
      expect(isBase36Prefix('ZZZZZZ')).toBe(true);
    });
  });

  describe('parseProjectPrefix', () => {
    it('should parse valid base36 prefixes', () => {
      expect(parseProjectPrefix('000000')).toBe(0);
      expect(parseProjectPrefix('000001')).toBe(1);
      expect(parseProjectPrefix('0000rs')).toBe(1000);
    });

    it('should return null for invalid prefixes', () => {
      expect(parseProjectPrefix('abc')).toBeNull(); // Too short
      expect(parseProjectPrefix('')).toBeNull();
      expect(parseProjectPrefix('001')).toBeNull(); // Too short
      expect(parseProjectPrefix('1234567')).toBeNull(); // Too long
    });
  });

  describe('formatProjectNumber', () => {
    it('should format as 6-char zero-padded base36', () => {
      expect(formatProjectNumber(0)).toBe('000000');
      expect(formatProjectNumber(1)).toBe('000001');
      expect(formatProjectNumber(1000)).toBe('0000rs');
      expect(formatProjectNumber(3456000)).toBe('0222o0');
    });
  });

  describe('getNextProjectNumber', () => {
    it('should return epoch-based ID for non-existent directory', () => {
      const result = getNextProjectNumber('/non/existent/path');
      const expected = Math.floor(Date.now() / 1000) - RAF_EPOCH;
      // Allow 2-second tolerance
      expect(result).toBeGreaterThanOrEqual(expected - 2);
      expect(result).toBeLessThanOrEqual(expected + 2);
    });

    it('should return epoch-based ID for empty directory', () => {
      const result = getNextProjectNumber(tempDir);
      const expected = Math.floor(Date.now() / 1000) - RAF_EPOCH;
      expect(result).toBeGreaterThanOrEqual(expected - 2);
      expect(result).toBeLessThanOrEqual(expected + 2);
    });

    it('should avoid collision with existing project', () => {
      // Create a project with the current epoch ID
      const currentId = Math.floor(Date.now() / 1000) - RAF_EPOCH;
      const encoded = encodeBase36(currentId);
      fs.mkdirSync(path.join(tempDir, `${encoded}-existing`));

      const result = getNextProjectNumber(tempDir);
      expect(result).toBeGreaterThan(currentId);
    });

    it('should skip multiple collisions', () => {
      const currentId = Math.floor(Date.now() / 1000) - RAF_EPOCH;
      // Create consecutive IDs to force increment
      for (let i = 0; i < 3; i++) {
        const encoded = encodeBase36(currentId + i);
        fs.mkdirSync(path.join(tempDir, `${encoded}-project${i}`));
      }

      const result = getNextProjectNumber(tempDir);
      expect(result).toBeGreaterThanOrEqual(currentId + 3);
    });
  });

  describe('listProjects', () => {
    it('should list projects with 6-char prefix in order', () => {
      fs.mkdirSync(path.join(tempDir, '000002-second'));
      fs.mkdirSync(path.join(tempDir, '000001-first'));
      fs.mkdirSync(path.join(tempDir, '000003-third'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(3);
      expect(projects[0]?.name).toBe('first');
      expect(projects[1]?.name).toBe('second');
      expect(projects[2]?.name).toBe('third');
    });

    it('should ignore non-project directories', () => {
      fs.mkdirSync(path.join(tempDir, '000001-valid'));
      fs.mkdirSync(path.join(tempDir, 'not-a-project'));
      fs.mkdirSync(path.join(tempDir, 'random'));
      fs.mkdirSync(path.join(tempDir, '001-too-short'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('valid');
      expect(projects[0]?.number).toBe(1);
    });

    it('should return empty array for non-existent directory', () => {
      const projects = listProjects('/non/existent/path');
      expect(projects).toEqual([]);
    });
  });

  describe('extractProjectNumber', () => {
    it('should extract 6-char prefix from path', () => {
      expect(extractProjectNumber('/RAF/000001-my-project')).toBe('000001');
      expect(extractProjectNumber('/RAF/00abc0-another-project')).toBe('00abc0');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectNumber('/RAF/my-project')).toBeNull();
      expect(extractProjectNumber('')).toBeNull();
      expect(extractProjectNumber('/RAF/001-too-short')).toBeNull();
      expect(extractProjectNumber('/RAF/not-numbered')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectNumber('/RAF/000001-my-project/')).toBe('000001');
    });

    it('should handle uppercase prefixes', () => {
      expect(extractProjectNumber('/RAF/00ABC0-my-project')).toBe('00abc0');
    });
  });

  describe('extractProjectName', () => {
    it('should extract project name from 6-char prefix path', () => {
      expect(extractProjectName('/RAF/000001-my-project')).toBe('my-project');
      expect(extractProjectName('/RAF/00abc0-another-project')).toBe('another-project');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectName('/RAF/my-project')).toBeNull();
      expect(extractProjectName('')).toBeNull();
      expect(extractProjectName('/RAF/001-too-short')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectName('/RAF/000001-my-project/')).toBe('my-project');
    });

    it('should handle project names with hyphens', () => {
      expect(extractProjectName('/RAF/000001-my-complex-project-name')).toBe('my-complex-project-name');
    });

    it('should handle project names with numbers', () => {
      expect(extractProjectName('/RAF/000001-project-v2')).toBe('project-v2');
    });
  });

  describe('extractTaskNameFromPlanFile', () => {
    it('should extract task name from 2-char base36 plan file', () => {
      expect(extractTaskNameFromPlanFile('01-fix-login-bug.md')).toBe('fix-login-bug');
      expect(extractTaskNameFromPlanFile('0a-add-feature.md')).toBe('add-feature');
    });

    it('should extract task name from various base36 plan files', () => {
      expect(extractTaskNameFromPlanFile('01-first-task.md')).toBe('first-task');
      expect(extractTaskNameFromPlanFile('99-last-task.md')).toBe('last-task');
    });

    it('should return null for invalid filenames', () => {
      expect(extractTaskNameFromPlanFile('abc-task.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('not-numbered.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('')).toBeNull();
    });

    it('should handle task names with hyphens', () => {
      expect(extractTaskNameFromPlanFile('01-my-complex-task-name.md')).toBe('my-complex-task-name');
    });

    it('should handle task names with numbers', () => {
      expect(extractTaskNameFromPlanFile('01-task-v2.md')).toBe('task-v2');
      expect(extractTaskNameFromPlanFile('01-123-test.md')).toBe('123-test');
    });

    it('should handle full paths', () => {
      expect(extractTaskNameFromPlanFile('/path/to/plans/02-fix-login-bug.md')).toBe('fix-login-bug');
    });

    it('should handle files without .md extension', () => {
      expect(extractTaskNameFromPlanFile('01-task-name')).toBe('task-name');
    });

    it('should return null for single-character task ID', () => {
      expect(extractTaskNameFromPlanFile('1-task.md')).toBeNull();
    });
  });

  describe('resolveProjectIdentifier', () => {
    it('should resolve project by base36 prefix', () => {
      fs.mkdirSync(path.join(tempDir, '000003-my-project'));
      const result = resolveProjectIdentifier(tempDir, '000003');
      expect(result).toBe(path.join(tempDir, '000003-my-project'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '000005-my-awesome-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-awesome-project');
      expect(result).toBe(path.join(tempDir, '000005-my-awesome-project'));
    });

    it('should return null for non-existent project prefix', () => {
      fs.mkdirSync(path.join(tempDir, '000001-first'));
      const result = resolveProjectIdentifier(tempDir, '0000rs');
      expect(result).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-first'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const result = resolveProjectIdentifier('/non/existent/path', '000001');
      expect(result).toBeNull();
    });

    it('should handle multiple projects and find correct one by prefix', () => {
      fs.mkdirSync(path.join(tempDir, '000001-first'));
      fs.mkdirSync(path.join(tempDir, '000002-second'));
      fs.mkdirSync(path.join(tempDir, '000003-third'));

      expect(resolveProjectIdentifier(tempDir, '000001')).toBe(path.join(tempDir, '000001-first'));
      expect(resolveProjectIdentifier(tempDir, '000002')).toBe(path.join(tempDir, '000002-second'));
      expect(resolveProjectIdentifier(tempDir, '000003')).toBe(path.join(tempDir, '000003-third'));
    });

    it('should handle multiple projects and find correct one by name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-first'));
      fs.mkdirSync(path.join(tempDir, '000002-second'));
      fs.mkdirSync(path.join(tempDir, '000003-third'));

      expect(resolveProjectIdentifier(tempDir, 'first')).toBe(path.join(tempDir, '000001-first'));
      expect(resolveProjectIdentifier(tempDir, 'second')).toBe(path.join(tempDir, '000002-second'));
      expect(resolveProjectIdentifier(tempDir, 'third')).toBe(path.join(tempDir, '000003-third'));
    });

    it('should not resolve partial name match', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'my')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'project')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'my-proj')).toBeNull();
    });
  });

  describe('getDecisionsPath', () => {
    it('should return decisions.md at project root', () => {
      const projectPath = '/Users/foo/RAF/000001-my-project';
      expect(getDecisionsPath(projectPath)).toBe(path.join(projectPath, 'decisions.md'));
    });
  });

  describe('resolveProjectIdentifier (full folder name)', () => {
    it('should resolve project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '000001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '000001-fix-stuff'));
    });

    it('should resolve project with hyphens in name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-cool-project'));
      const result = resolveProjectIdentifier(tempDir, '000001-my-cool-project');
      expect(result).toBe(path.join(tempDir, '000001-my-cool-project'));
    });

    it('should return null for wrong prefix with correct name format', () => {
      fs.mkdirSync(path.join(tempDir, '000001-correct-name'));
      const result = resolveProjectIdentifier(tempDir, '000002-correct-name');
      expect(result).toBeNull();
    });

    it('should return null for correct prefix with wrong name format', () => {
      fs.mkdirSync(path.join(tempDir, '000001-correct-name'));
      const result = resolveProjectIdentifier(tempDir, '000001-wrong-name');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching', () => {
      fs.mkdirSync(path.join(tempDir, '00ABC0-My-Project'));
      const result = resolveProjectIdentifier(tempDir, '00abc0-my-project');
      expect(result).toBe(path.join(tempDir, '00ABC0-My-Project'));
    });

    it('should still resolve by name alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '000001-my-project'));
    });

    it('should still resolve by prefix alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, '000003-my-project'));
      const result = resolveProjectIdentifier(tempDir, '000003');
      expect(result).toBe(path.join(tempDir, '000003-my-project'));
    });

    it('should prefer exact full folder match over name-only match', () => {
      fs.mkdirSync(path.join(tempDir, '000001-project'));
      fs.mkdirSync(path.join(tempDir, '000002-000001-project'));

      const result = resolveProjectIdentifier(tempDir, '000001-project');
      expect(result).toBe(path.join(tempDir, '000001-project'));
    });
  });

  describe('resolveProjectIdentifier (case-insensitive name matching)', () => {
    it('should match project name case-insensitively', () => {
      fs.mkdirSync(path.join(tempDir, '000001-fix-double-summary-headers'));

      expect(resolveProjectIdentifier(tempDir, 'fix-double-summary-headers')).toBe(
        path.join(tempDir, '000001-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'Fix-Double-Summary-Headers')).toBe(
        path.join(tempDir, '000001-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'FIX-DOUBLE-SUMMARY-HEADERS')).toBe(
        path.join(tempDir, '000001-fix-double-summary-headers')
      );
    });

    it('should match mixed case project name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-MyProject'));

      expect(resolveProjectIdentifier(tempDir, 'myproject')).toBe(
        path.join(tempDir, '000001-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MYPROJECT')).toBe(
        path.join(tempDir, '000001-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MyProject')).toBe(
        path.join(tempDir, '000001-MyProject')
      );
    });
  });

  describe('resolveProjectIdentifierWithDetails', () => {
    it('should return path for unique name match', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBe(path.join(tempDir, '000001-my-project'));
      expect(result.error).toBeUndefined();
      expect(result.matches).toBeUndefined();
    });

    it('should return ambiguous error for multiple projects with same name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      fs.mkdirSync(path.join(tempDir, '000002-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
      expect(result.matches?.[0]?.folder).toBe('000001-my-project');
      expect(result.matches?.[1]?.folder).toBe('000002-my-project');
    });

    it('should return ambiguous error for case-insensitive duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, '000001-MyProject'));
      fs.mkdirSync(path.join(tempDir, '000002-myproject'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'myproject');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
    });

    it('should return not_found error for non-existent project', () => {
      fs.mkdirSync(path.join(tempDir, '000001-existing-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'non-existent');
      expect(result.path).toBeNull();
      expect(result.error).toBe('not_found');
      expect(result.matches).toBeUndefined();
    });

    it('should return not_found error for non-existent directory', () => {
      const result = resolveProjectIdentifierWithDetails('/non/existent/path', 'project');
      expect(result.path).toBeNull();
      expect(result.error).toBe('not_found');
    });

    it('should resolve by prefix even with duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      fs.mkdirSync(path.join(tempDir, '000002-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, '000001');
      expect(result1.path).toBe(path.join(tempDir, '000001-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, '000002');
      expect(result2.path).toBe(path.join(tempDir, '000002-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should resolve by full folder name even with duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      fs.mkdirSync(path.join(tempDir, '000002-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, '000001-my-project');
      expect(result1.path).toBe(path.join(tempDir, '000001-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, '000002-my-project');
      expect(result2.path).toBe(path.join(tempDir, '000002-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should sort matches by project number', () => {
      fs.mkdirSync(path.join(tempDir, '000005-duplicate'));
      fs.mkdirSync(path.join(tempDir, '000001-duplicate'));
      fs.mkdirSync(path.join(tempDir, '000003-duplicate'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'duplicate');
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(3);
      expect(result.matches?.[0]?.number).toBe(1);
      expect(result.matches?.[1]?.number).toBe(3);
      expect(result.matches?.[2]?.number).toBe(5);
    });
  });
});
