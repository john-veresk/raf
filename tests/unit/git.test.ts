import { parseGitStatus } from '../../src/core/git.js';

describe('git utilities', () => {
  describe('parseGitStatus', () => {
    it('should return empty array for empty output', () => {
      expect(parseGitStatus('')).toEqual([]);
      expect(parseGitStatus('   ')).toEqual([]);
    });

    it('should parse modified files (staged)', () => {
      const output = 'M  src/file.ts';
      expect(parseGitStatus(output)).toEqual(['src/file.ts']);
    });

    it('should parse modified files (unstaged)', () => {
      // Git porcelain format: XY PATH (X=index, Y=worktree, space, then path)
      // For unstaged modification: ' M filename' (space, M, space, filename)
      const output = ' M src/file.ts';
      expect(parseGitStatus(output)).toEqual(['src/file.ts']);
    });

    it('should parse modified files (both staged and unstaged)', () => {
      const output = 'MM src/file.ts';
      expect(parseGitStatus(output)).toEqual(['src/file.ts']);
    });

    it('should parse added files', () => {
      const output = 'A  src/new-file.ts';
      expect(parseGitStatus(output)).toEqual(['src/new-file.ts']);
    });

    it('should parse deleted files', () => {
      const output = 'D  src/old-file.ts';
      expect(parseGitStatus(output)).toEqual(['src/old-file.ts']);
    });

    it('should parse untracked files', () => {
      const output = '?? src/untracked.ts';
      expect(parseGitStatus(output)).toEqual(['src/untracked.ts']);
    });

    it('should parse renamed files (extracting new name)', () => {
      const output = 'R  old-name.ts -> new-name.ts';
      expect(parseGitStatus(output)).toEqual(['new-name.ts']);
    });

    it('should parse copied files (extracting new name)', () => {
      const output = 'C  original.ts -> copy.ts';
      expect(parseGitStatus(output)).toEqual(['copy.ts']);
    });

    it('should parse multiple files', () => {
      const output = `M  src/modified.ts
A  src/added.ts
D  src/deleted.ts
?? src/untracked.ts`;
      expect(parseGitStatus(output)).toEqual([
        'src/modified.ts',
        'src/added.ts',
        'src/deleted.ts',
        'src/untracked.ts',
      ]);
    });

    it('should handle quoted paths with special characters', () => {
      const output = '"src/file with spaces.ts"';
      // This is incomplete input but tests quote handling
      // Real git status has format: XY "path"
      const output2 = 'M  "src/file with spaces.ts"';
      expect(parseGitStatus(output2)).toEqual(['src/file with spaces.ts']);
    });

    it('should skip malformed lines', () => {
      const output = `M  valid.ts
ab
M  another.ts`;
      expect(parseGitStatus(output)).toEqual(['valid.ts', 'another.ts']);
    });
  });
});
