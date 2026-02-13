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
        return 'RAF/aaaaar-decision-vault/input.md\nRAF/aaaaar-decision-vault/decisions.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Verify git add was called for both files (individual calls)
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);
    const addCmds = addCalls.map((c) => c[0] as string);
    expect(addCmds.some((cmd) => cmd.includes('input.md'))).toBe(true);
    expect(addCmds.some((cmd) => cmd.includes('decisions.md'))).toBe(true);

    // Verify commit message format
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/git commit -m "RAF\[aaaaar\] Plan: decision-vault"/),
      expect.any(Object)
    );
  });

  it('should handle base26 project numbers', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/abcdef-feature/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/abcdef-my-feature');

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/git commit -m "RAF\[abcdef\] Plan: my-feature"/),
      expect.any(Object)
    );
  });

  it('should warn and return when not in git repository', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

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

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Should log debug message and not throw
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'No changes to planning artifacts to commit (git add succeeded but nothing changed in index)'
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
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        throw new Error('nothing to commit, working tree clean');
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

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
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        throw new Error('commit failed for unknown reason');
      }
      return '';
    });

    // Should not throw
    await expect(
      commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault')
    ).resolves.toBeUndefined();

    // Should log warning
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to commit planning artifacts')
    );
  });

  it('should stage input.md and decisions.md individually', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Verify git add was called individually for each file
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);

    const addCmds = addCalls.map((c) => c[0] as string);
    expect(addCmds[0]).toContain('/Users/test/RAF/aaaaar-decision-vault/input.md');
    expect(addCmds[1]).toContain('/Users/test/RAF/aaaaar-decision-vault/decisions.md');

    // Individual calls should NOT use wildcards or add all
    for (const cmd of addCmds) {
      expect(cmd).not.toContain('-A');
      expect(cmd).not.toContain('--all');
      expect(cmd).not.toContain('*');
    }
  });

  it('should use "Amend:" prefix when isAmend is true', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault', { isAmend: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringMatching(/git commit -m "RAF\[aaaaar\] Amend: decision-vault"/),
      expect.any(Object)
    );
  });

  it('should not stage plan files in amend mode', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault', {
      isAmend: true,
    });

    // Verify git add called for only 2 files (input, decisions)
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);

    const addCmds = addCalls.map((c) => c[0] as string);
    expect(addCmds.some((cmd) => cmd.includes('input.md'))).toBe(true);
    expect(addCmds.some((cmd) => cmd.includes('decisions.md'))).toBe(true);
  });

  it('should pass cwd to isGitRepo for worktree support', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault', {
      cwd: '/tmp/worktree',
    });

    // The first call should be isGitRepo with cwd
    const revParseCall = mockExecSync.mock.calls.find(
      (call) => (call[0] as string).includes('rev-parse')
    );
    expect(revParseCall).toBeDefined();
    expect(revParseCall?.[1]).toEqual(expect.objectContaining({ cwd: '/tmp/worktree' }));
  });

  it('should convert paths to relative when cwd is provided (worktree mode)', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      return '';
    });

    const worktreePath = '/Users/test/.raf/worktrees/myapp/aaaaar-decision-vault';
    const projectPath = `${worktreePath}/RAF/aaaaar-decision-vault`;

    await commitPlanningArtifacts(projectPath, {
      cwd: worktreePath,
    });

    // Verify git add uses relative paths (not absolute)
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);

    const addCmds = addCalls.map((c) => c[0] as string);
    // Paths should be relative to worktree root
    expect(addCmds[0]).toContain('RAF/aaaaar-decision-vault/input.md');
    expect(addCmds[1]).toContain('RAF/aaaaar-decision-vault/decisions.md');
    // Should NOT contain absolute worktree prefix
    expect(addCmds[0]).not.toContain(worktreePath);
    expect(addCmds[1]).not.toContain(worktreePath);
  });

  it('should use absolute paths when no cwd is provided (standard mode)', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/input.md\n';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Verify git add uses absolute paths
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);

    const addCmds = addCalls.map((c) => c[0] as string);
    expect(addCmds[0]).toContain('/Users/test/RAF/aaaaar-decision-vault/input.md');
    expect(addCmds[1]).toContain('/Users/test/RAF/aaaaar-decision-vault/decisions.md');
  });

  it('should continue staging other files when one file fails to stage', async () => {
    let addCallCount = 0;
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        addCallCount++;
        // First call (input.md) fails
        if (addCallCount === 1) {
          throw new Error("fatal: pathspec 'input.md' did not match any files");
        }
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/decisions.md\n';
      }
      if (cmdStr.includes('git commit')) {
        return '';
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Should have tried both files
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(2);

    // Should warn about the failed file
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to stage')
    );

    // Should still commit the successfully staged file
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git commit'),
      expect.any(Object)
    );
  });

  it('should not attempt commit when all files fail to stage', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add')) {
        throw new Error('fatal: pathspec did not match any files');
      }
      return '';
    });

    await commitPlanningArtifacts('/Users/test/RAF/aaaaar-decision-vault');

    // Should log debug about no files staged
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'No files were staged for planning artifacts commit'
    );

    // Should NOT try to commit
    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git commit'),
      expect.any(Object)
    );
  });

  it('should convert additional file paths to relative in worktree mode', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = cmd as string;
      if (cmdStr.includes('rev-parse')) {
        return 'true\n';
      }
      if (cmdStr.includes('git add') || cmdStr.includes('git commit')) {
        return '';
      }
      if (cmdStr.includes('git diff --cached')) {
        return 'RAF/aaaaar-decision-vault/plans/04-new-task.md\n';
      }
      return '';
    });

    const worktreePath = '/Users/test/.raf/worktrees/myapp/aaaaar-decision-vault';
    const projectPath = `${worktreePath}/RAF/aaaaar-decision-vault`;
    const additionalFiles = [
      `${projectPath}/plans/04-new-task.md`,
    ];

    await commitPlanningArtifacts(projectPath, {
      cwd: worktreePath,
      additionalFiles,
      isAmend: true,
    });

    // All git add calls should use relative paths
    const addCalls = mockExecSync.mock.calls.filter(
      (call) => (call[0] as string).includes('git add')
    );
    expect(addCalls.length).toBe(3); // input, decisions, plan

    for (const call of addCalls) {
      const cmd = call[0] as string;
      expect(cmd).not.toContain(worktreePath);
    }

    // Verify the plan file path is relative
    const planAddCall = addCalls.find(
      (call) => (call[0] as string).includes('04-new-task.md')
    );
    expect(planAddCall).toBeDefined();
    expect((planAddCall![0] as string)).toContain('RAF/aaaaar-decision-vault/plans/04-new-task.md');
  });
});
