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
const { commitProjectFolder } = await import('../../src/core/git.js');

describe('commitProjectFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when not in a git repository', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not in a git repository');
  });

  it('should commit project folder with correct message format', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached --name-only')) {
        return 'RAF/001-my-project/input.md\nRAF/001-my-project/plans/001-task.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(true);
    expect(result.message).toBe('RAF(my-project): Plan complete');
    expect(mockExecSync).toHaveBeenCalledWith(
      'git commit -m "RAF(my-project): Plan complete"',
      expect.any(Object)
    );
  });

  it('should only stage files in the project folder', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        // Verify the add command includes the project path
        expect(cmdStr).toContain('/path/to/RAF/001-my-project');
        return '';
      }
      if (cmdStr.includes('git diff --cached --name-only')) {
        return 'RAF/001-my-project/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(true);
  });

  it('should return success with message when no changes to commit', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached --name-only')) {
        return ''; // No staged changes
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(true);
    expect(result.message).toBe('No changes to commit');
  });

  it('should handle git add failure gracefully', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        throw new Error('git add failed');
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(false);
    expect(result.error).toContain('git add failed');
  });

  it('should handle git commit failure gracefully', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached --name-only')) {
        return 'RAF/001-my-project/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        throw new Error('commit failed');
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-my-project', 'my-project');
    expect(result.success).toBe(false);
    expect(result.error).toContain('commit failed');
  });

  it('should escape quotes in project path', () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached --name-only')) {
        return 'RAF/001-my-project/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    const result = commitProjectFolder('/path/to/RAF/001-test-project', 'test-project');
    expect(result.success).toBe(true);
    // Check the add command was called with quoted path
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git add "/path/to/RAF/001-test-project"'),
      expect.any(Object)
    );
  });
});
