import { jest } from '@jest/globals';

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock logger to prevent console output
const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

// Import after mocking
const { commitPlanningArtifacts } = await import('../../src/core/git.js');

describe('commitPlanningArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should commit input.md and decisions.md with correct message format', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/017-decision-vault/input.md\nRAF/017-decision-vault/decisions.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/017-decision-vault');

    // Verify git add was called with both files
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git add'),
      expect.any(Object)
    );
    const addCall = mockExecSync.mock.calls.find(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCall?.[0]).toContain('input.md');
    expect(addCall?.[0]).toContain('decisions.md');

    // Verify commit message format
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/git commit -m "RAF\[017\] Plan: decision-vault"/),
      expect.any(Object)
    );
  });

  it('should handle base36 project numbers', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/a01-feature/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/a01-my-feature');

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/git commit -m "RAF\[a01\] Plan: my-feature"/),
      expect.any(Object)
    );
  });

  it('should warn and return when not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    await commitPlanningArtifacts('/Users/test/RAF/017-decision-vault');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Not in a git repository, skipping planning artifacts commit'
    );
  });

  it('should warn when project number cannot be extracted', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/invalid-project');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Could not extract project number or name from path, skipping commit'
    );
  });

  it('should handle "nothing to commit" gracefully', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return ''; // No staged changes
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/017-decision-vault');

    // Should log debug message and not throw
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'No changes to planning artifacts to commit'
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should handle commit error with "nothing to commit" message', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/017-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        throw new Error('nothing to commit, working tree clean');
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/017-decision-vault');

    // Should log debug message for "nothing to commit"
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Planning artifacts already committed or no changes'
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should warn on other git errors without throwing', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/017-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        throw new Error('commit failed for unknown reason');
      }
      return '';
    });

    // Should not throw
    await expect(
      commitPlanningArtifacts('/Users/test/RAF/017-decision-vault')
    ).resolves.toBeUndefined();

    // Should log warning
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to commit planning artifacts')
    );
  });

  it('should only stage input.md and decisions.md', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/017-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/017-decision-vault');

    // Verify git add was called with explicit file paths
    const addCall = mockExecSync.mock.calls.find(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCall).toBeDefined();
    const addCmd = addCall?.[0] as string;

    // Should contain explicit file paths
    expect(addCmd).toContain('/Users/test/RAF/017-decision-vault/input.md');
    expect(addCmd).toContain('/Users/test/RAF/017-decision-vault/decisions.md');

    // Should NOT use wildcards or add all
    expect(addCmd).not.toContain('-A');
    expect(addCmd).not.toContain('--all');
    expect(addCmd).not.toContain('*');
  });
});
