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
});
