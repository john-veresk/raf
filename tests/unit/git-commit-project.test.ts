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

    const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not in a git repository');
  });

  describe('plan commits', () => {
    it('should commit with RAF[<project-number>:plan] format', () => {
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

      const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
      expect(result.success).toBe(true);
      expect(result.message).toBe('RAF[001:plan]');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git commit -m "RAF[001:plan]"',
        expect.any(Object)
      );
    });

    it('should use plan as default commit type', () => {
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

      // Call without the third argument - should default to 'plan'
      const result = commitProjectFolder('/path/to/RAF/005-test', '005');
      expect(result.success).toBe(true);
      expect(result.message).toBe('RAF[005:plan]');
    });

    it('should handle base36 project numbers for plan commits', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('rev-parse')) {
          return 'true\n';
        }
        if (cmdStr.includes('git add')) {
          return '';
        }
        if (cmdStr.includes('git diff --cached --name-only')) {
          return 'RAF/a00-large-project/input.md\n';
        }
        if (cmdStr.includes('git commit')) {
          return '';
        }
        return '';
      });

      const result = commitProjectFolder('/path/to/RAF/a00-large-project', 'a00', 'plan');
      expect(result.success).toBe(true);
      expect(result.message).toBe('RAF[a00:plan]');
    });
  });

  describe('outcome commits', () => {
    it('should commit with RAF[<project-number>:outcome] format', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('rev-parse')) {
          return 'true\n';
        }
        if (cmdStr.includes('git add')) {
          return '';
        }
        if (cmdStr.includes('git diff --cached --name-only')) {
          return 'RAF/005-my-project/outcomes/001-task.md\n';
        }
        if (cmdStr.includes('git commit')) {
          return '';
        }
        return '';
      });

      const result = commitProjectFolder('/path/to/RAF/005-my-project', '005', 'outcome');
      expect(result.success).toBe(true);
      expect(result.message).toBe('RAF[005:outcome]');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git commit -m "RAF[005:outcome]"',
        expect.any(Object)
      );
    });

    it('should handle base36 project numbers for outcome commits', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('rev-parse')) {
          return 'true\n';
        }
        if (cmdStr.includes('git add')) {
          return '';
        }
        if (cmdStr.includes('git diff --cached --name-only')) {
          return 'RAF/a01-project/outcomes/001-task.md\n';
        }
        if (cmdStr.includes('git commit')) {
          return '';
        }
        return '';
      });

      const result = commitProjectFolder('/path/to/RAF/a01-project', 'a01', 'outcome');
      expect(result.success).toBe(true);
      expect(result.message).toBe('RAF[a01:outcome]');
    });
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

    const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
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

    const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
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

    const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
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

    const result = commitProjectFolder('/path/to/RAF/001-my-project', '001', 'plan');
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

    const result = commitProjectFolder('/path/to/RAF/001-test-project', '001', 'plan');
    expect(result.success).toBe(true);
    // Check the add command was called with quoted path
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git add "/path/to/RAF/001-test-project"'),
      expect.any(Object)
    );
  });
});
