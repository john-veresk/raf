import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectMigrations, type MigrationEntry } from '../../src/commands/migrate.js';
import { encodeBase26 } from '../../src/utils/paths.js';

describe('migrate-project-ids-base26', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-migrate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectMigrations', () => {
    it('should detect 3-char base36 legacy folders', () => {
      fs.mkdirSync(path.join(tempDir, '007-my-project'));
      fs.mkdirSync(path.join(tempDir, '01a-feature'));

      const migrations = detectMigrations(tempDir);

      expect(migrations).toHaveLength(2);

      // 007 in base36 = 7, encodeBase26(7) = "aaaaah"
      const m007 = migrations.find(m => m.oldName === '007-my-project');
      expect(m007).toBeDefined();
      expect(m007!.newName).toBe(`${encodeBase26(parseInt('007', 36))}-my-project`);
      expect(m007!.newName).toBe('aaaaah-my-project');

      // 01a in base36 = 46, encodeBase26(46) = "aaaabu"
      const m01a = migrations.find(m => m.oldName === '01a-feature');
      expect(m01a).toBeDefined();
      expect(m01a!.newName).toBe(`${encodeBase26(parseInt('01a', 36))}-feature`);
      expect(m01a!.newName).toBe('aaaabu-feature');
    });

    it('should detect 6-char base36 legacy folders with digits', () => {
      fs.mkdirSync(path.join(tempDir, '021h44-letterjam'));
      fs.mkdirSync(path.join(tempDir, '00j3k1-fix-stuff'));

      const migrations = detectMigrations(tempDir);

      expect(migrations).toHaveLength(2);

      const m1 = migrations.find(m => m.oldName === '021h44-letterjam');
      expect(m1).toBeDefined();
      expect(m1!.newName).toBe(`${encodeBase26(parseInt('021h44', 36))}-letterjam`);

      const m2 = migrations.find(m => m.oldName === '00j3k1-fix-stuff');
      expect(m2).toBeDefined();
      expect(m2!.newName).toBe(`${encodeBase26(parseInt('00j3k1', 36))}-fix-stuff`);
    });

    it('should skip already-migrated base26 folders', () => {
      fs.mkdirSync(path.join(tempDir, 'abcdef-my-project'));
      fs.mkdirSync(path.join(tempDir, 'aaaaab-another'));

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(0);
    });

    it('should skip non-directory entries', () => {
      fs.writeFileSync(path.join(tempDir, '007-not-a-dir'), 'file');

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(0);
    });

    it('should return empty array for non-existent directory', () => {
      const migrations = detectMigrations(path.join(tempDir, 'nonexistent'));
      expect(migrations).toHaveLength(0);
    });

    it('should return empty array when no legacy folders exist', () => {
      fs.mkdirSync(path.join(tempDir, 'abcdef-project'));
      fs.mkdirSync(path.join(tempDir, 'random-folder'));

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(0);
    });

    it('should handle mixed legacy and migrated folders', () => {
      fs.mkdirSync(path.join(tempDir, '007-old-project'));
      fs.mkdirSync(path.join(tempDir, 'abcdef-new-project'));
      fs.mkdirSync(path.join(tempDir, '021h44-medium-project'));

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(2);
      expect(migrations.map(m => m.oldName).sort()).toEqual(['007-old-project', '021h44-medium-project']);
    });

    it('should produce correct paths', () => {
      fs.mkdirSync(path.join(tempDir, '007-my-project'));

      const migrations = detectMigrations(tempDir);
      expect(migrations[0]!.oldPath).toBe(path.join(tempDir, '007-my-project'));
      expect(migrations[0]!.newPath).toBe(path.join(tempDir, 'aaaaah-my-project'));
    });

    it('should handle 3-char base36 edge cases', () => {
      // "000" = 0
      fs.mkdirSync(path.join(tempDir, '000-zero'));
      // "zzz" = 36^3 - 1 = 46655
      fs.mkdirSync(path.join(tempDir, 'zzz-max'));

      const migrations = detectMigrations(tempDir);

      // "zzz" contains no digits but matches 3-char pattern
      // Wait — "zzz" has no digits. The 3-char pattern is [0-9a-z]{3}
      // so "zzz" matches the 3-char pattern (3 chars, all lowercase letters/digits)
      // It gets detected as a legacy 3-char folder

      const m000 = migrations.find(m => m.oldName === '000-zero');
      expect(m000).toBeDefined();
      expect(m000!.newName).toBe('aaaaaa-zero');

      const mZzz = migrations.find(m => m.oldName === 'zzz-max');
      expect(mZzz).toBeDefined();
      expect(mZzz!.newName).toBe(`${encodeBase26(46655)}-max`);
    });

    it('should not match folders without a hyphen after the prefix', () => {
      fs.mkdirSync(path.join(tempDir, '007'));

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(0);
    });

    it('should handle 6-char all-letter prefix that is not pure a-z', () => {
      // "abcde1" has a digit, so it's legacy
      fs.mkdirSync(path.join(tempDir, 'abcde1-mixed'));

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(1);
      expect(migrations[0]!.oldName).toBe('abcde1-mixed');
    });
  });

  describe('migration execution (integration)', () => {
    it('should rename folders when executed', () => {
      fs.mkdirSync(path.join(tempDir, '007-my-project'));
      fs.writeFileSync(path.join(tempDir, '007-my-project', 'input.md'), 'test');

      const migrations = detectMigrations(tempDir);
      expect(migrations).toHaveLength(1);

      // Simulate what executeMigrations does
      const m = migrations[0]!;
      fs.renameSync(m.oldPath, m.newPath);

      // Old folder should not exist
      expect(fs.existsSync(path.join(tempDir, '007-my-project'))).toBe(false);
      // New folder should exist with contents
      expect(fs.existsSync(path.join(tempDir, 'aaaaah-my-project'))).toBe(true);
      expect(fs.readFileSync(path.join(tempDir, 'aaaaah-my-project', 'input.md'), 'utf-8')).toBe('test');
    });

    it('should preserve folder contents during rename', () => {
      const oldDir = path.join(tempDir, '021h44-letterjam');
      fs.mkdirSync(oldDir);
      fs.mkdirSync(path.join(oldDir, 'plans'));
      fs.mkdirSync(path.join(oldDir, 'outcomes'));
      fs.writeFileSync(path.join(oldDir, 'input.md'), 'requirements');
      fs.writeFileSync(path.join(oldDir, 'plans', '01-task.md'), 'plan');

      const migrations = detectMigrations(tempDir);
      const m = migrations[0]!;
      fs.renameSync(m.oldPath, m.newPath);

      expect(fs.existsSync(path.join(m.newPath, 'input.md'))).toBe(true);
      expect(fs.existsSync(path.join(m.newPath, 'plans', '01-task.md'))).toBe(true);
      expect(fs.readFileSync(path.join(m.newPath, 'input.md'), 'utf-8')).toBe('requirements');
    });
  });

  describe('encoding correctness', () => {
    it('3-char base36 IDs produce small base26 values', () => {
      // 007 base36 = 7
      expect(encodeBase26(7)).toBe('aaaaah');
      // 023 base36 = 75
      expect(encodeBase26(parseInt('023', 36))).toBe('aaaacx');
      // 100 base36 = 1296
      expect(encodeBase26(parseInt('100', 36))).toBe('aaabxw');
    });

    it('6-char base36 epoch IDs produce reasonable base26 values', () => {
      // These are large numbers (seconds since epoch)
      const val = parseInt('021h44', 36);
      const encoded = encodeBase26(val);
      expect(encoded).toHaveLength(6);
      expect(/^[a-z]{6}$/.test(encoded)).toBe(true);
    });
  });
});
