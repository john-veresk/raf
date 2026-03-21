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

  describe('parseProjectPrefix', () => {
    it('should parse valid numeric prefixes', () => {
      expect(parseProjectPrefix('1')).toBe(1);
      expect(parseProjectPrefix('3')).toBe(3);
      expect(parseProjectPrefix('12')).toBe(12);
      expect(parseProjectPrefix('100')).toBe(100);
    });

    it('should return null for invalid prefixes', () => {
      expect(parseProjectPrefix('abc')).toBeNull();
      expect(parseProjectPrefix('')).toBeNull();
      expect(parseProjectPrefix('12a')).toBeNull();
      expect(parseProjectPrefix('abcdef')).toBeNull();
    });
  });

  describe('formatProjectNumber', () => {
    it('should format as plain number string', () => {
      expect(formatProjectNumber(1)).toBe('1');
      expect(formatProjectNumber(3)).toBe('3');
      expect(formatProjectNumber(12)).toBe('12');
      expect(formatProjectNumber(100)).toBe('100');
    });
  });

  describe('getNextProjectNumber', () => {
    it('should return 1 for non-existent directory', () => {
      const result = getNextProjectNumber('/non/existent/path');
      expect(result).toBe(1);
    });

    it('should return 1 for empty directory', () => {
      const result = getNextProjectNumber(tempDir);
      expect(result).toBe(1);
    });

    it('should return max + 1 for existing projects', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      fs.mkdirSync(path.join(tempDir, '3-third'));

      const result = getNextProjectNumber(tempDir);
      expect(result).toBe(4);
    });

    it('should handle gaps in IDs', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      fs.mkdirSync(path.join(tempDir, '5-fifth'));

      const result = getNextProjectNumber(tempDir);
      expect(result).toBe(6);
    });
  });

  describe('listProjects', () => {
    it('should list projects with numeric prefix in order', () => {
      fs.mkdirSync(path.join(tempDir, '2-second'));
      fs.mkdirSync(path.join(tempDir, '1-first'));
      fs.mkdirSync(path.join(tempDir, '3-third'));

      const projects = listProjects(tempDir);
      expect(projects).toHaveLength(3);
      expect(projects[0]?.name).toBe('first');
      expect(projects[1]?.name).toBe('second');
      expect(projects[2]?.name).toBe('third');
    });

    it('should ignore non-project directories', () => {
      fs.mkdirSync(path.join(tempDir, '1-valid'));
      fs.mkdirSync(path.join(tempDir, 'not-a-project'));
      fs.mkdirSync(path.join(tempDir, 'random'));
      fs.mkdirSync(path.join(tempDir, 'abcdef-old-base26'));

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
    it('should extract numeric prefix from path', () => {
      expect(extractProjectNumber('/RAF/1-my-project')).toBe('1');
      expect(extractProjectNumber('/RAF/12-another-project')).toBe('12');
      expect(extractProjectNumber('/RAF/100-big-project')).toBe('100');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectNumber('/RAF/my-project')).toBeNull();
      expect(extractProjectNumber('')).toBeNull();
      expect(extractProjectNumber('/RAF/not-numbered')).toBeNull();
      expect(extractProjectNumber('/RAF/abcdef-old-base26')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectNumber('/RAF/3-my-project/')).toBe('3');
    });
  });

  describe('extractProjectName', () => {
    it('should extract project name from numeric prefix path', () => {
      expect(extractProjectName('/RAF/1-my-project')).toBe('my-project');
      expect(extractProjectName('/RAF/12-another-project')).toBe('another-project');
    });

    it('should return null for invalid paths', () => {
      expect(extractProjectName('/RAF/my-project')).toBeNull();
      expect(extractProjectName('')).toBeNull();
      expect(extractProjectName('/RAF/abcdef-old-base26')).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      expect(extractProjectName('/RAF/3-my-project/')).toBe('my-project');
    });

    it('should handle project names with hyphens', () => {
      expect(extractProjectName('/RAF/1-my-complex-project-name')).toBe('my-complex-project-name');
    });

    it('should handle project names with numbers', () => {
      expect(extractProjectName('/RAF/1-project-v2')).toBe('project-v2');
    });
  });

  describe('extractTaskNameFromPlanFile', () => {
    it('should extract task name from numeric plan file', () => {
      expect(extractTaskNameFromPlanFile('1-fix-login-bug.md')).toBe('fix-login-bug');
      expect(extractTaskNameFromPlanFile('10-add-feature.md')).toBe('add-feature');
    });

    it('should extract task name from various numeric plan files', () => {
      expect(extractTaskNameFromPlanFile('1-first-task.md')).toBe('first-task');
      expect(extractTaskNameFromPlanFile('99-last-task.md')).toBe('last-task');
      expect(extractTaskNameFromPlanFile('100-big-task.md')).toBe('big-task');
    });

    it('should return null for invalid filenames', () => {
      expect(extractTaskNameFromPlanFile('abc-task.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('not-numbered.md')).toBeNull();
      expect(extractTaskNameFromPlanFile('')).toBeNull();
    });

    it('should handle task names with hyphens', () => {
      expect(extractTaskNameFromPlanFile('1-my-complex-task-name.md')).toBe('my-complex-task-name');
    });

    it('should handle task names with numbers', () => {
      expect(extractTaskNameFromPlanFile('1-task-v2.md')).toBe('task-v2');
      expect(extractTaskNameFromPlanFile('1-123-test.md')).toBe('123-test');
    });

    it('should handle full paths', () => {
      expect(extractTaskNameFromPlanFile('/path/to/plans/2-fix-login-bug.md')).toBe('fix-login-bug');
    });

    it('should handle files without .md extension', () => {
      expect(extractTaskNameFromPlanFile('1-task-name')).toBe('task-name');
    });

    it('should handle single-digit task IDs', () => {
      expect(extractTaskNameFromPlanFile('1-task.md')).toBe('task');
    });
  });

  describe('resolveProjectIdentifier', () => {
    it('should resolve project by numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '3-my-project'));
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '3-my-project'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '5-my-awesome-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-awesome-project');
      expect(result).toBe(path.join(tempDir, '5-my-awesome-project'));
    });

    it('should return null for non-existent project prefix', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      const result = resolveProjectIdentifier(tempDir, '99');
      expect(result).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const result = resolveProjectIdentifier('/non/existent/path', '1');
      expect(result).toBeNull();
    });

    it('should handle multiple projects and find correct one by prefix', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      fs.mkdirSync(path.join(tempDir, '2-second'));
      fs.mkdirSync(path.join(tempDir, '3-third'));

      expect(resolveProjectIdentifier(tempDir, '1')).toBe(path.join(tempDir, '1-first'));
      expect(resolveProjectIdentifier(tempDir, '2')).toBe(path.join(tempDir, '2-second'));
      expect(resolveProjectIdentifier(tempDir, '3')).toBe(path.join(tempDir, '3-third'));
    });

    it('should handle multiple projects and find correct one by name', () => {
      fs.mkdirSync(path.join(tempDir, '1-first'));
      fs.mkdirSync(path.join(tempDir, '2-second'));
      fs.mkdirSync(path.join(tempDir, '3-third'));

      expect(resolveProjectIdentifier(tempDir, 'first')).toBe(path.join(tempDir, '1-first'));
      expect(resolveProjectIdentifier(tempDir, 'second')).toBe(path.join(tempDir, '2-second'));
      expect(resolveProjectIdentifier(tempDir, 'third')).toBe(path.join(tempDir, '3-third'));
    });

    it('should not resolve partial name match', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'my')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'project')).toBeNull();
      expect(resolveProjectIdentifier(tempDir, 'my-proj')).toBeNull();
    });
  });

  describe('getDecisionsPath', () => {
    it('should return decisions.md at project root', () => {
      const projectPath = '/Users/foo/RAF/3-my-project';
      expect(getDecisionsPath(projectPath)).toBe(path.join(projectPath, 'decisions.md'));
    });
  });

  describe('resolveProjectIdentifier (full folder name)', () => {
    it('should resolve project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '1-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '1-fix-stuff');
      expect(result).toBe(path.join(tempDir, '1-fix-stuff'));
    });

    it('should resolve project with hyphens in name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-cool-project'));
      const result = resolveProjectIdentifier(tempDir, '1-my-cool-project');
      expect(result).toBe(path.join(tempDir, '1-my-cool-project'));
    });

    it('should return null for wrong prefix with correct name format', () => {
      fs.mkdirSync(path.join(tempDir, '1-correct-name'));
      const result = resolveProjectIdentifier(tempDir, '2-correct-name');
      expect(result).toBeNull();
    });

    it('should return null for correct prefix with wrong name format', () => {
      fs.mkdirSync(path.join(tempDir, '1-correct-name'));
      const result = resolveProjectIdentifier(tempDir, '1-wrong-name');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching', () => {
      fs.mkdirSync(path.join(tempDir, '1-My-Project'));
      const result = resolveProjectIdentifier(tempDir, '1-my-project');
      expect(result).toBe(path.join(tempDir, '1-My-Project'));
    });

    it('should still resolve by name alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '1-my-project'));
    });

    it('should still resolve by prefix alone after full folder check', () => {
      fs.mkdirSync(path.join(tempDir, '3-my-project'));
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '3-my-project'));
    });

    it('should prefer exact full folder match over name-only match', () => {
      fs.mkdirSync(path.join(tempDir, '1-project'));
      fs.mkdirSync(path.join(tempDir, '2-1-project'));

      const result = resolveProjectIdentifier(tempDir, '1-project');
      expect(result).toBe(path.join(tempDir, '1-project'));
    });
  });

  describe('resolveProjectIdentifier (case-insensitive name matching)', () => {
    it('should match project name case-insensitively', () => {
      fs.mkdirSync(path.join(tempDir, '1-fix-double-summary-headers'));

      expect(resolveProjectIdentifier(tempDir, 'fix-double-summary-headers')).toBe(
        path.join(tempDir, '1-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'Fix-Double-Summary-Headers')).toBe(
        path.join(tempDir, '1-fix-double-summary-headers')
      );
      expect(resolveProjectIdentifier(tempDir, 'FIX-DOUBLE-SUMMARY-HEADERS')).toBe(
        path.join(tempDir, '1-fix-double-summary-headers')
      );
    });

    it('should match mixed case project name', () => {
      fs.mkdirSync(path.join(tempDir, '1-MyProject'));

      expect(resolveProjectIdentifier(tempDir, 'myproject')).toBe(
        path.join(tempDir, '1-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MYPROJECT')).toBe(
        path.join(tempDir, '1-MyProject')
      );
      expect(resolveProjectIdentifier(tempDir, 'MyProject')).toBe(
        path.join(tempDir, '1-MyProject')
      );
    });
  });

  describe('resolveProjectIdentifierWithDetails', () => {
    it('should return path for unique name match', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBe(path.join(tempDir, '1-my-project'));
      expect(result.error).toBeUndefined();
      expect(result.matches).toBeUndefined();
    });

    it('should return ambiguous error for multiple projects with same name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      fs.mkdirSync(path.join(tempDir, '2-my-project'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'my-project');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
      expect(result.matches?.[0]?.folder).toBe('1-my-project');
      expect(result.matches?.[1]?.folder).toBe('2-my-project');
    });

    it('should return ambiguous error for case-insensitive duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, '1-MyProject'));
      fs.mkdirSync(path.join(tempDir, '2-myproject'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'myproject');
      expect(result.path).toBeNull();
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(2);
    });

    it('should return not_found error for non-existent project', () => {
      fs.mkdirSync(path.join(tempDir, '1-existing-project'));

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
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      fs.mkdirSync(path.join(tempDir, '2-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, '1');
      expect(result1.path).toBe(path.join(tempDir, '1-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, '2');
      expect(result2.path).toBe(path.join(tempDir, '2-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should resolve by full folder name even with duplicate names', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      fs.mkdirSync(path.join(tempDir, '2-my-project'));

      const result1 = resolveProjectIdentifierWithDetails(tempDir, '1-my-project');
      expect(result1.path).toBe(path.join(tempDir, '1-my-project'));
      expect(result1.error).toBeUndefined();

      const result2 = resolveProjectIdentifierWithDetails(tempDir, '2-my-project');
      expect(result2.path).toBe(path.join(tempDir, '2-my-project'));
      expect(result2.error).toBeUndefined();
    });

    it('should sort matches by project number', () => {
      fs.mkdirSync(path.join(tempDir, '5-duplicate'));
      fs.mkdirSync(path.join(tempDir, '1-duplicate'));
      fs.mkdirSync(path.join(tempDir, '3-duplicate'));

      const result = resolveProjectIdentifierWithDetails(tempDir, 'duplicate');
      expect(result.error).toBe('ambiguous');
      expect(result.matches).toHaveLength(3);
      expect(result.matches?.[0]?.number).toBe(1);
      expect(result.matches?.[1]?.number).toBe(3);
      expect(result.matches?.[2]?.number).toBe(5);
    });
  });
});
