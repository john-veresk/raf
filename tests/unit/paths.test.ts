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
  encodeBase26,
  decodeBase26,
  isBase26Prefix,
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

  describe('encodeBase26', () => {
    it('should encode 0 as aaaaaa', () => {
      expect(encodeBase26(0)).toBe('aaaaaa');
    });

    it('should encode small numbers with a-padding', () => {
      expect(encodeBase26(1)).toBe('aaaaab');
      expect(encodeBase26(25)).toBe('aaaaaz');
      expect(encodeBase26(26)).toBe('aaaaba');
    });

    it('should encode larger numbers correctly', () => {
      expect(encodeBase26(1000)).toBe('aaabmm');
      expect(encodeBase26(3456000)).toBe('ahoqlc');
    });

    it('should encode max 6-char value (26^6 - 1) as zzzzzz', () => {
      expect(encodeBase26(26 ** 6 - 1)).toBe('zzzzzz');
    });

    it('should encode boundary value (26^5) correctly', () => {
      expect(encodeBase26(26 ** 5)).toBe('baaaaa');
    });

    it('should throw for negative numbers', () => {
      expect(() => encodeBase26(-1)).toThrow();
      expect(() => encodeBase26(-100)).toThrow();
    });

    it('should produce 6-character strings', () => {
      for (const num of [0, 1, 100, 10000, 1000000]) {
        expect(encodeBase26(num)).toHaveLength(6);
      }
    });
  });

  describe('decodeBase26', () => {
    it('should decode aaaaaa as 0', () => {
      expect(decodeBase26('aaaaaa')).toBe(0);
    });

    it('should decode valid base26 strings', () => {
      expect(decodeBase26('aaaaab')).toBe(1);
      expect(decodeBase26('aaaaaz')).toBe(25);
      expect(decodeBase26('aaaaba')).toBe(26);
      expect(decodeBase26('aaabmm')).toBe(1000);
    });

    it('should return null for invalid format', () => {
      expect(decodeBase26('abc')).toBeNull(); // Too short
      expect(decodeBase26('abcdefg')).toBeNull(); // Too long
      expect(decodeBase26('')).toBeNull(); // Empty
      expect(decodeBase26('abc123')).toBeNull(); // Contains digits
    });

    it('should handle uppercase input', () => {
      expect(decodeBase26('AAABMM')).toBe(1000);
      expect(decodeBase26('AAAAAZ')).toBe(25);
    });

    it('should decode max value zzzzzz', () => {
      expect(decodeBase26('zzzzzz')).toBe(26 ** 6 - 1);
    });

    it('should be inverse of encodeBase26', () => {
      for (const num of [0, 1, 25, 26, 1000, 100000, 3456000, 26 ** 6 - 1]) {
        expect(decodeBase26(encodeBase26(num))).toBe(num);
      }
    });
  });

  describe('isBase26Prefix', () => {
    it('should return true for valid 6-char base26 prefixes', () => {
      expect(isBase26Prefix('aaaaaa')).toBe(true);
      expect(isBase26Prefix('abcdef')).toBe(true);
      expect(isBase26Prefix('zzzzzz')).toBe(true);
      expect(isBase26Prefix('aaabmm')).toBe(true);
    });

    it('should return false for strings with digits', () => {
      expect(isBase26Prefix('000000')).toBe(false);
      expect(isBase26Prefix('00abc0')).toBe(false);
      expect(isBase26Prefix('0000rs')).toBe(false);
    });

    it('should return false for wrong-length strings', () => {
      expect(isBase26Prefix('abc')).toBe(false); // Too short
      expect(isBase26Prefix('abcdefg')).toBe(false); // Too long
      expect(isBase26Prefix('')).toBe(false); // Empty
    });

    it('should handle uppercase', () => {
      expect(isBase26Prefix('ABCDEF')).toBe(true);
      expect(isBase26Prefix('ZZZZZZ')).toBe(true);
    });
  });

  describe('parseProjectPrefix', () => {
    it('should parse valid base26 prefixes', () => {
      expect(parseProjectPrefix('aaaaaa')).toBe(0);
      expect(parseProjectPrefix('aaaaab')).toBe(1);
      expect(parseProjectPrefix('aaabmm')).toBe(1000);
    });

    it('should return null for invalid prefixes', () => {
      expect(parseProjectPrefix('abc')).toBeNull(); // Too short
      expect(parseProjectPrefix('')).toBeNull();
      expect(parseProjectPrefix('000001')).toBeNull(); // Contains digits
      expect(parseProjectPrefix('abcdefg')).toBeNull(); // Too long
    });
  });

  describe('formatProjectNumber', () => {
    it('should format as 6-char a-padded base26', () => {
      expect(formatProjectNumber(0)).toBe('aaaaaa');
      expect(formatProjectNumber(1)).toBe('aaaaab');
      expect(formatProjectNumber(1000)).toBe('aaabmm');
      expect(formatProjectNumber(3456000)).toBe('ahoqlc');
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
      const encoded = encodeBase26(currentId);
      fs.mkdirSync(path.join(tempDir, `${encoded}-existing`));

      const result = getNextProjectNumber(tempDir);
      expect(result).toBeGreaterThan(currentId);
    });

    it('should skip multiple collisions', () => {
      const currentId = Math.floor(Date.now() / 1000) - RAF_EPOCH;
      // Create consecutive IDs to force increment
      for (let i = 0; i < 3; i++) {
        const encoded = encodeBase26(currentId + i);
        fs.mkdirSync(path.join(tempDir, `${encoded}-project${i}`));
      }

      const result = getNextProjectNumber(tempDir);
      expect(result).toBeGreaterThanOrEqual(currentId + 3);
    });
  });

  describe('listProjects', () => {
    it('should list projects with 6-char prefix in order', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaac-second'));
      fs.mkdirSync(path.join(tempDir, 'aaaaab-first'));
      fs.mkdirSync(path.join(tempDir, 'aaaaad-third'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(3);
      expect(projects[0]?.name).toBe('first');
      expect(projects[1]?.name).toBe('second');
      expect(projects[2]?.name).toBe('third');
    });

    it('should ignore non-project directories', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-valid'));
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
      expect(extractProjectNumber('/RAF/aaaaab-my-project')).toBe('aaaaab');
      expect(extractProjectNumber('/RAF/abcdef-another-project')).toBe('abcdef');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectNumber('/RAF/my-project')).toBeNull();
      expect(extractProjectNumber('')).toBeNull();
      expect(extractProjectNumber('/RAF/001-too-short')).toBeNull();
      expect(extractProjectNumber('/RAF/not-numbered')).toBeNull();
      expect(extractProjectNumber('/RAF/000001-has-digits')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectNumber('/RAF/aaaaab-my-project/')).toBe('aaaaab');
    });

    it('should handle uppercase prefixes', () => {
      expect(extractProjectNumber('/RAF/ABCDEF-my-project')).toBe('abcdef');
    });
  });

  describe('extractProjectName', () => {
    it('should extract project name from 6-char prefix path', () => {
      expect(extractProjectName('/RAF/aaaaab-my-project')).toBe('my-project');
      expect(extractProjectName('/RAF/abcdef-another-project')).toBe('another-project');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectName('/RAF/my-project')).toBeNull();
      expect(extractProjectName('')).toBeNull();
      expect(extractProjectName('/RAF/001-too-short')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectName('/RAF/aaaaab-my-project/')).toBe('my-project');
    });

    it('should handle project names with hyphens', () => {
      expect(extractProjectName('/RAF/aaaaab-my-complex-project-name')).toBe('my-complex-project-name');
    });

    it('should handle project names with numbers', () => {
      expect(extractProjectName('/RAF/aaaaab-project-v2')).toBe('project-v2');
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
    it('should resolve project by base26 prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaad-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaad');
      expect(result).toBe(path.join(tempDir, 'aaaaad-my-project'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaaf-my-awesome-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-awesome-project');
      expect(result).toBe(path.join(tempDir, 'aaaaaf-my-awesome-project'));
    });

    it('should return null for non-existent project prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-first'));
      const result = resolveProjectIdentifier(tempDir, 'aaabmm');
      expect(result).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-first'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const result = resolveProjectIdentifier('/non/existent/path', 'aaaaab');
      expect(result).toBeNull();
    });

    it('should handle multiple projects and find correct one by prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-first'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-second'));
      fs.mkdirSync(path.join(tempDir, 'aaaaad-third'));

      expect(resolveProjectIdentifier(tempDir, 'aaaaab')).toBe(path.join(tempDir, 'aaaaab-first'));
      expect(resolveProjectIdentifier(tempDir, 'aaaaac')).toBe(path.join(tempDir, 'aaaaac-second'));
      expect(resolveProjectIdentifier(tempDir, 'aaaaad')).toBe(path.join(tempDir, 'aaaaad-third'));
    });

    it('should handle multiple projects and find correct one by name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-first'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-second'));
      fs.mkdirSync(path.join(tempDir, 'aaaaad-third'));

      expect(resolveProjectIdentifier(tempDir, 'first')).toBe(path.join(tempDir, 'aaaaab-first'));
      expect(resolveProjectIdentifier(tempDir, 'second')).toBe(path.join(tempDir, 'aaaaac-second'));
      expect(resolveProjectIdentifier(tempDir, 'third')).toBe(path.join(tempDir, 'aaaaad-third'));
    });

    it('should not resolve partial name match', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'my')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'project')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'my-proj')).toBeNull();
    });
  });

  describe('getDecisionsPath', () => {
    it('should return decisions.md at project root', () => {
      const projectPath = '/Users/foo/RAF/aaaaab-my-project';
      expect(getDecisionsPath(projectPath)).toBe(path.join(projectPath, 'decisions.md'));
    });
  });

  describe('resolveProjectIdentifier (full folder name)', () => {
    it('should resolve project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-fix-stuff');
      expect(result).toBe(path.join(tempDir, 'aaaaab-fix-stuff'));
    });

    it('should resolve project with hyphens in name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-cool-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-my-cool-project');
      expect(result).toBe(path.join(tempDir, 'aaaaab-my-cool-project'));
    });

    it('should return null for wrong prefix with correct name format', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-correct-name'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaac-correct-name');
      expect(result).toBeNull();
    });

    it('should return null for correct prefix with wrong name format', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-correct-name'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaab-wrong-name');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching', () => {
      fs.mkdirSync(path.join(tempDir, 'ABCDEF-My-Project'));
      const result = resolveProjectIdentifier(tempDir, 'abcdef-my-project');
      expect(result).toBe(path.join(tempDir, 'ABCDEF-My-Project'));
    });

    it('should still resolve by name alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, 'aaaaab-my-project'));
    });

    it('should still resolve by prefix alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaad-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'aaaaad');
      expect(result).toBe(path.join(tempDir, 'aaaaad-my-project'));
    });

    it('should prefer exact full folder match over name-only match', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-aaaaab-project'));

      const result = resolveProjectIdentifier(tempDir, 'aaaaab-project');
      expect(result).toBe(path.join(tempDir, 'aaaaab-project'));
    });
  });

  describe('resolveProjectIdentifier (case-insensitive name matching)', () => {
    it('should match project name case-insensitively', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-fix-double-summary-headers'));

      expect(resolveProjectIdentifier(tempDir, 'fix-double-summary-headers')).toBe(
        path.join(tempDir, 'aaaaab-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'Fix-Double-Summary-Headers')).toBe(
        path.join(tempDir, 'aaaaab-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'FIX-DOUBLE-SUMMARY-HEADERS')).toBe(
        path.join(tempDir, 'aaaaab-fix-double-summary-headers')
      );
    });

    it('should match mixed case project name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-MyProject'));

      expect(resolveProjectIdentifier(tempDir, 'myproject')).toBe(
        path.join(tempDir, 'aaaaab-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MYPROJECT')).toBe(
        path.join(tempDir, 'aaaaab-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MyProject')).toBe(
        path.join(tempDir, 'aaaaab-MyProject')
      );
    });
  });

  describe('resolveProjectIdentifierWithDetails', () => {
    it('should return path for unique name match', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBe(path.join(tempDir, 'aaaaab-my-project'));
      expect(result.error).toBeUndefined();
      expect(result.matches).toBeUndefined();
    });

    it('should return ambiguous error for multiple projects with same name', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
      expect(result.matches?.[0]?.folder).toBe('aaaaab-my-project');
      expect(result.matches?.[1]?.folder).toBe('aaaaac-my-project');
    });

    it('should return ambiguous error for case-insensitive duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-MyProject'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-myproject'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'myproject');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
    });

    it('should return not_found error for non-existent project', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-existing-project'));

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
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, 'aaaaab');
      expect(result1.path).toBe(path.join(tempDir, 'aaaaab-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, 'aaaaac');
      expect(result2.path).toBe(path.join(tempDir, 'aaaaac-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should resolve by full folder name even with duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaab-my-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaac-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, 'aaaaab-my-project');
      expect(result1.path).toBe(path.join(tempDir, 'aaaaab-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, 'aaaaac-my-project');
      expect(result2.path).toBe(path.join(tempDir, 'aaaaac-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should sort matches by project number', () => {
      fs.mkdirSync(path.join(tempDir, 'aaaaaf-duplicate'));
      fs.mkdirSync(path.join(tempDir, 'aaaaab-duplicate'));
      fs.mkdirSync(path.join(tempDir, 'aaaaad-duplicate'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'duplicate');
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(3);
      expect(result.matches?.[0]?.number).toBe(1);
      expect(result.matches?.[1]?.number).toBe(3);
      expect(result.matches?.[2]?.number).toBe(5);
    });
  });
});
