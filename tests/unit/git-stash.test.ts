import { jest } from '@jest/globals';

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock logger to prevent console output
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
const { stashChanges, isGitRepo, hasUncommittedChanges } = await import('../../src/core/git.js');

describe('stashChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in a git repository', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = stashChanges('test-stash');
    expect(result).toBe(false);
  });

  it('should return false when there are no uncommitted changes', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('status --porcelain')) {
        return ''; // No changes
      }
      return '';
    });

    const result = stashChanges('test-stash');
    expect(result).toBe(false);
  });

  it('should stash changes with descriptive name', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('status --porcelain')) {
        return 'M  src/file.ts\n';
      }
      if (cmdStr.includes('stash push')) {
        return '';
      }
      return '';
    });

    const result = stashChanges('raf-aaaaab-task-3-failed');
    expect(result).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(
      'git stash push -m "raf-aaaaab-task-3-failed"',
      expect.any(Object)
    );
  });

  it('should escape quotes in stash name', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('status --porcelain')) {
        return 'M  src/file.ts\n';
      }
      if (cmdStr.includes('stash push')) {
        return '';
      }
      return '';
    });

    const result = stashChanges('test "with" quotes');
    expect(result).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(
      'git stash push -m "test \\"with\\" quotes"',
      expect.any(Object)
    );
  });

  it('should return false if stash command fails', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('status --porcelain')) {
        return 'M  src/file.ts\n';
      }
      if (cmdStr.includes('stash push')) {
        throw new Error('stash failed');
      }
      return '';
    });

    const result = stashChanges('test-stash');
    expect(result).toBe(false);
  });

  it('should use correct stash name format for RAF failures', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('status --porcelain')) {
        return 'M  src/file.ts\nA  src/new.ts\n';
      }
      if (cmdStr.includes('stash push')) {
        return '';
      }
      return '';
    });

    const result = stashChanges('raf-aaaaac-task-5-failed');
    expect(result).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(
      'git stash push -m "raf-aaaaac-task-5-failed"',
      expect.any(Object)
    );
  });
});
