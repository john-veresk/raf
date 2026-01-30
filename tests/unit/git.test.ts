import {
  parseGitStatus,
  getTaskChangedFiles,
  formatCommitMessage,
} from '../../src/core/git.js';

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

  describe('getTaskChangedFiles', () => {
    it('should return empty array when no current files', () => {
      const result = getTaskChangedFiles([], ['baseline.ts']);
      expect(result).toEqual([]);
    });

    it('should return all current files when baseline is empty', () => {
      const result = getTaskChangedFiles(['new1.ts', 'new2.ts'], []);
      expect(result).toEqual(['new1.ts', 'new2.ts']);
    });

    it('should return only new files (not in baseline)', () => {
      const current = ['file1.ts', 'file2.ts', 'file3.ts'];
      const baseline = ['file1.ts'];
      const result = getTaskChangedFiles(current, baseline);
      expect(result).toEqual(['file2.ts', 'file3.ts']);
    });

    it('should exclude all files that were in baseline', () => {
      const current = ['file1.ts', 'file2.ts'];
      const baseline = ['file1.ts', 'file2.ts', 'file3.ts'];
      const result = getTaskChangedFiles(current, baseline);
      expect(result).toEqual([]);
    });

    it('should handle overlapping files correctly', () => {
      const current = ['a.ts', 'b.ts', 'c.ts'];
      const baseline = ['b.ts', 'd.ts'];
      const result = getTaskChangedFiles(current, baseline);
      // a.ts and c.ts are new (not in baseline)
      expect(result).toEqual(['a.ts', 'c.ts']);
    });

    it('should be case-sensitive', () => {
      const current = ['File.ts', 'file.ts'];
      const baseline = ['file.ts'];
      const result = getTaskChangedFiles(current, baseline);
      expect(result).toEqual(['File.ts']);
    });

    it('should handle paths with special characters', () => {
      const current = ['src/my-file.ts', 'src/my_file.ts'];
      const baseline = ['src/my-file.ts'];
      const result = getTaskChangedFiles(current, baseline);
      expect(result).toEqual(['src/my_file.ts']);
    });
  });

  describe('formatCommitMessage', () => {
    it('should format message with project name prefix', () => {
      const result = formatCommitMessage('Task 001 complete', 'my-project');
      expect(result).toBe('RAF(my-project): Task 001 complete');
    });

    it('should return original message when no project name provided', () => {
      const result = formatCommitMessage('Task 001 complete');
      expect(result).toBe('Task 001 complete');
    });

    it('should return original message when project name is undefined', () => {
      const result = formatCommitMessage('Task 001 complete', undefined);
      expect(result).toBe('Task 001 complete');
    });

    it('should handle project names with hyphens', () => {
      const result = formatCommitMessage('Complete', 'my-complex-project');
      expect(result).toBe('RAF(my-complex-project): Complete');
    });

    it('should handle project names with numbers', () => {
      const result = formatCommitMessage('Done', 'project-v2');
      expect(result).toBe('RAF(project-v2): Done');
    });

    it('should handle empty message', () => {
      const result = formatCommitMessage('', 'my-project');
      expect(result).toBe('RAF(my-project): ');
    });
  });
});
