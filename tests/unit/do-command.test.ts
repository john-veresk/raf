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
    it('should resolve project by full numeric folder name: raf do 001-fix-stuff', () => {
      fs.mkdirSync(path.join(tempDir, '001-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '001-fix-stuff'));
    });

    it('should resolve project by full base36 folder name: raf do a00-project', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-project'));
      const result = resolveProjectIdentifier(tempDir, 'a00-project');
      expect(result).toBe(path.join(tempDir, 'a00-project'));
    });

    it('should resolve 2-digit prefix full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '01-short'));
      const result = resolveProjectIdentifier(tempDir, '01-short');
      expect(result).toBe(path.join(tempDir, '01-short'));
    });

    it('should resolve 3-digit prefix full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '123-three-digits'));
      const result = resolveProjectIdentifier(tempDir, '123-three-digits');
      expect(result).toBe(path.join(tempDir, '123-three-digits'));
    });
  });

  describe('Multiple Projects with Full Folder Names: raf do 001-a 002-b', () => {
    it('should resolve multiple projects by full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));
      fs.mkdirSync(path.join(tempDir, '003-project-c'));

      const identifiers = ['001-project-a', '002-project-b', '003-project-c'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-b'));
      expect(resolved[2]).toBe(path.join(tempDir, '003-project-c'));
    });

    it('should handle gaps in project numbers with full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '001-first'));
      fs.mkdirSync(path.join(tempDir, '005-fifth'));

      const identifiers = ['001-first', '005-fifth'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(path.join(tempDir, '001-first'));
      expect(resolved[1]).toBe(path.join(tempDir, '005-fifth'));
    });
  });

  describe('Mixed Formats: raf do 3 001-fix-stuff my-project', () => {
    it('should resolve mixed number, full folder name, and project name', () => {
      fs.mkdirSync(path.join(tempDir, '003-by-number'));
      fs.mkdirSync(path.join(tempDir, '001-fix-stuff'));
      fs.mkdirSync(path.join(tempDir, '002-my-project'));

      const identifiers = ['3', '001-fix-stuff', 'my-project'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, '003-by-number'));
      expect(resolved[1]).toBe(path.join(tempDir, '001-fix-stuff'));
      expect(resolved[2]).toBe(path.join(tempDir, '002-my-project'));
    });

    it('should resolve mixed base36 prefix and full folder names', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-by-prefix'));
      fs.mkdirSync(path.join(tempDir, '001-full-name'));
      fs.mkdirSync(path.join(tempDir, 'b00-another-prefix'));

      const identifiers = ['a00', '001-full-name', 'b00-another-prefix'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, 'a00-by-prefix'));
      expect(resolved[1]).toBe(path.join(tempDir, '001-full-name'));
      expect(resolved[2]).toBe(path.join(tempDir, 'b00-another-prefix'));
    });

    it('should resolve all five identifier formats', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-one'));
      fs.mkdirSync(path.join(tempDir, '002-project-two'));
      fs.mkdirSync(path.join(tempDir, '003-project-three'));
      fs.mkdirSync(path.join(tempDir, 'a00-project-four'));
      fs.mkdirSync(path.join(tempDir, '005-project-five'));

      const identifiers = [
        '1',                    // Short number
        '002',                  // Padded number
        '003-project-three',    // Full numeric folder name
        'project-four',         // Project name
        'a00',                  // Base36 prefix
      ];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(5);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-one'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-two'));
      expect(resolved[2]).toBe(path.join(tempDir, '003-project-three'));
      expect(resolved[3]).toBe(path.join(tempDir, 'a00-project-four'));
      expect(resolved[4]).toBe(path.join(tempDir, 'a00-project-four'));
    });
  });

  describe('Error Messages for Non-Matching Full Folder Names', () => {
    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-existing'));
      const result = resolveProjectIdentifier(tempDir, '002-non-existent');
      expect(result).toBeNull();
    });

    it('should return null when prefix exists but name differs', () => {
      fs.mkdirSync(path.join(tempDir, '001-actual-name'));
      const result = resolveProjectIdentifier(tempDir, '001-different-name');
      expect(result).toBeNull();
    });

    it('should return null when name exists but prefix differs', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      const result = resolveProjectIdentifier(tempDir, '999-my-project');
      expect(result).toBeNull();
    });

    it('should return null for base36 full folder name when only numeric exists', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'a01-my-project');
      expect(result).toBeNull();
    });
  });

  describe('Backward Compatibility', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));
      fs.mkdirSync(path.join(tempDir, '002-another-project'));
      fs.mkdirSync(path.join(tempDir, 'a00-base36-project'));
    });

    it('should still resolve by number (short)', () => {
      expect(resolveProjectIdentifier(tempDir, '1')).toBe(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, '2')).toBe(path.join(tempDir, '002-another-project'));
    });

    it('should still resolve by number (padded)', () => {
      expect(resolveProjectIdentifier(tempDir, '001')).toBe(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, '002')).toBe(path.join(tempDir, '002-another-project'));
    });

    it('should still resolve by base36 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, 'a00')).toBe(path.join(tempDir, 'a00-base36-project'));
    });

    it('should still resolve by project name', () => {
      expect(resolveProjectIdentifier(tempDir, 'my-project')).toBe(path.join(tempDir, '001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'another-project')).toBe(path.join(tempDir, '002-another-project'));
      expect(resolveProjectIdentifier(tempDir, 'base36-project')).toBe(path.join(tempDir, 'a00-base36-project'));
    });
  });

  describe('Project Name Extraction with Full Folder Names', () => {
    it('should extract name from numeric full folder path', () => {
      const projectPath = path.join(tempDir, '001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract name from base36 full folder path', () => {
      const projectPath = path.join(tempDir, 'a00-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should handle multi-hyphen names', () => {
      const projectPath = path.join(tempDir, '001-my-cool-project-name');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-cool-project-name');
    });
  });
});
