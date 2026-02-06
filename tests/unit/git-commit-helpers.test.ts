import { jest } from '@jest/globals';

const mockExecSync = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

const { getHeadCommitHash, getHeadCommitMessage, isFileCommittedInHead } = await import('../../src/core/git.js');

describe('git commit helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHeadCommitHash', () => {
    it('should return the current HEAD hash', () => {
      mockExecSync.mockReturnValue('abc123def456\n');
      expect(getHeadCommitHash()).toBe('abc123def456');
    });

    it('should return null if not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(getHeadCommitHash()).toBeNull();
    });

    it('should return null for empty output', () => {
      mockExecSync.mockReturnValue('');
      expect(getHeadCommitHash()).toBeNull();
    });

    it('should trim whitespace from hash', () => {
      mockExecSync.mockReturnValue('  abc123  \n');
      expect(getHeadCommitHash()).toBe('abc123');
    });
  });

  describe('getHeadCommitMessage', () => {
    it('should return the HEAD commit message', () => {
      mockExecSync.mockReturnValue('RAF[005:001] Add validation\n');
      expect(getHeadCommitMessage()).toBe('RAF[005:001] Add validation');
    });

    it('should return null if not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(getHeadCommitMessage()).toBeNull();
    });

    it('should return null for empty output', () => {
      mockExecSync.mockReturnValue('');
      expect(getHeadCommitMessage()).toBeNull();
    });
  });

  describe('isFileCommittedInHead', () => {
    it('should return true when file exists in HEAD', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('--show-toplevel')) {
          return '/project\n';
        }
        if (typeof cmd === 'string' && cmd.includes('ls-tree')) {
          return '100644 blob abc123\tRAF/outcomes/001-task.md\n';
        }
        return '';
      });
      expect(isFileCommittedInHead('/project/RAF/outcomes/001-task.md')).toBe(true);
    });

    it('should return false when file does not exist in HEAD', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('--show-toplevel')) {
          return '/project\n';
        }
        if (typeof cmd === 'string' && cmd.includes('ls-tree')) {
          return '';
        }
        return '';
      });
      expect(isFileCommittedInHead('/project/RAF/outcomes/001-task.md')).toBe(false);
    });

    it('should return false if not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(isFileCommittedInHead('/any/path')).toBe(false);
    });

    it('should return false on git command failure', () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('--show-toplevel')) {
          return '/project\n';
        }
        throw new Error('git ls-tree failed');
      });
      expect(isFileCommittedInHead('/project/file.ts')).toBe(false);
    });
  });
});
