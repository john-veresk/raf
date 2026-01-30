import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveProjectIdentifier } from '../../src/utils/paths.js';

describe('Multi-Project Execution', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-multiproject-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Project Resolution', () => {
    it('should resolve multiple projects by number', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));
      fs.mkdirSync(path.join(tempDir, '003-project-c'));

      const identifiers = ['001', '002', '003'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-b'));
      expect(resolved[2]).toBe(path.join(tempDir, '003-project-c'));
    });

    it('should resolve multiple projects by name', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));

      const identifiers = ['project-a', 'project-b'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-b'));
    });

    it('should resolve mixed number and name identifiers', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));
      fs.mkdirSync(path.join(tempDir, '003-project-c'));

      const identifiers = ['001', 'project-b', '3'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-b'));
      expect(resolved[2]).toBe(path.join(tempDir, '003-project-c'));
    });

    it('should return null for non-existent projects in list', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '003-project-c'));

      const identifiers = ['001', '002', '003'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBeNull(); // 002 doesn't exist
      expect(resolved[2]).toBe(path.join(tempDir, '003-project-c'));
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicates when same project specified by number', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));

      const identifiers = ['001', '001'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const uniquePaths = new Set(resolved.filter(Boolean));

      expect(uniquePaths.size).toBe(1);
    });

    it('should detect duplicates when same project specified by number and name', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));

      const identifiers = ['001', 'project-a'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const uniquePaths = new Set(resolved.filter(Boolean));

      expect(uniquePaths.size).toBe(1);
      expect(resolved[0]).toBe(resolved[1]); // Both resolve to same path
    });

    it('should detect duplicates with different number formats', () => {
      fs.mkdirSync(path.join(tempDir, '005-project'));

      const identifiers = ['5', '05', '005'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const uniquePaths = new Set(resolved.filter(Boolean));

      expect(uniquePaths.size).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project list', () => {
      const identifiers: string[] = [];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      expect(resolved).toHaveLength(0);
    });

    it('should handle all invalid identifiers', () => {
      const identifiers = ['999', 'non-existent', 'fake'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const valid = resolved.filter(Boolean);

      expect(valid).toHaveLength(0);
    });

    it('should handle single project', () => {
      fs.mkdirSync(path.join(tempDir, '001-project'));

      const identifiers = ['001'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project'));
    });

    it('should handle projects with similar names', () => {
      fs.mkdirSync(path.join(tempDir, '001-test'));
      fs.mkdirSync(path.join(tempDir, '002-test-feature'));
      fs.mkdirSync(path.join(tempDir, '003-testing'));

      // Exact name match only
      expect(resolveProjectIdentifier(tempDir, 'test')).toBe(path.join(tempDir, '001-test'));
      expect(resolveProjectIdentifier(tempDir, 'test-feature')).toBe(path.join(tempDir, '002-test-feature'));
      expect(resolveProjectIdentifier(tempDir, 'testing')).toBe(path.join(tempDir, '003-testing'));
    });
  });

  describe('Order Preservation', () => {
    it('should resolve projects in the order specified', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));
      fs.mkdirSync(path.join(tempDir, '003-project-c'));

      // Specify out of order
      const identifiers = ['003', '001', '002'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved[0]).toBe(path.join(tempDir, '003-project-c'));
      expect(resolved[1]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[2]).toBe(path.join(tempDir, '002-project-b'));
    });
  });

  describe('Full Folder Name Support', () => {
    it('should resolve single project by full folder name with numeric prefix', () => {
      fs.mkdirSync(path.join(tempDir, '001-fix-stuff'));

      const result = resolveProjectIdentifier(tempDir, '001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '001-fix-stuff'));
    });

    it('should resolve single project by full folder name with base36 prefix', () => {
      fs.mkdirSync(path.join(tempDir, 'a00-important-project'));

      const result = resolveProjectIdentifier(tempDir, 'a00-important-project');
      expect(result).toBe(path.join(tempDir, 'a00-important-project'));
    });

    it('should resolve multiple projects by full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));
      fs.mkdirSync(path.join(tempDir, '002-project-b'));

      const identifiers = ['001-project-a', '002-project-b'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(path.join(tempDir, '001-project-a'));
      expect(resolved[1]).toBe(path.join(tempDir, '002-project-b'));
    });

    it('should resolve mixed identifier formats including full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '003-numeric-id'));
      fs.mkdirSync(path.join(tempDir, '001-full-folder-name'));
      fs.mkdirSync(path.join(tempDir, '002-by-name'));

      // Mix of number, full folder name, and project name
      const identifiers = ['3', '001-full-folder-name', 'by-name'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(3);
      expect(resolved[0]).toBe(path.join(tempDir, '003-numeric-id'));
      expect(resolved[1]).toBe(path.join(tempDir, '001-full-folder-name'));
      expect(resolved[2]).toBe(path.join(tempDir, '002-by-name'));
    });

    it('should return null for invalid full folder name (wrong prefix)', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));

      // Correct name but wrong prefix
      const result = resolveProjectIdentifier(tempDir, '002-my-project');
      expect(result).toBeNull();
    });

    it('should return null for invalid full folder name (wrong name)', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-project'));

      // Correct prefix but wrong name
      const result = resolveProjectIdentifier(tempDir, '001-other-project');
      expect(result).toBeNull();
    });

    it('should detect duplicates when same project specified by number and full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));

      const identifiers = ['001', '001-project-a'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const uniquePaths = new Set(resolved.filter(Boolean));

      expect(uniquePaths.size).toBe(1);
      expect(resolved[0]).toBe(resolved[1]); // Both resolve to same path
    });

    it('should detect duplicates when same project specified by name and full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '001-project-a'));

      const identifiers = ['project-a', '001-project-a'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));
      const uniquePaths = new Set(resolved.filter(Boolean));

      expect(uniquePaths.size).toBe(1);
      expect(resolved[0]).toBe(resolved[1]); // Both resolve to same path
    });

    it('should handle case-insensitive full folder name matching', () => {
      fs.mkdirSync(path.join(tempDir, '001-My-Project'));

      const result = resolveProjectIdentifier(tempDir, '001-my-project');
      expect(result).toBe(path.join(tempDir, '001-My-Project'));
    });

    it('should handle full folder names with multiple hyphens', () => {
      fs.mkdirSync(path.join(tempDir, '001-my-cool-project-name'));

      const result = resolveProjectIdentifier(tempDir, '001-my-cool-project-name');
      expect(result).toBe(path.join(tempDir, '001-my-cool-project-name'));
    });

    it('should handle 2-digit prefix full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '01-short-prefix'));

      const result = resolveProjectIdentifier(tempDir, '01-short-prefix');
      expect(result).toBe(path.join(tempDir, '01-short-prefix'));
    });

    it('should resolve mixed base36 and numeric full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '001-numeric'));
      fs.mkdirSync(path.join(tempDir, 'a01-base36'));

      const identifiers = ['001-numeric', 'a01-base36'];
      const resolved = identifiers.map((id) => resolveProjectIdentifier(tempDir, id));

      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(path.join(tempDir, '001-numeric'));
      expect(resolved[1]).toBe(path.join(tempDir, 'a01-base36'));
    });
  });
});
