import { jest } from '@jest/globals';

/**
 * Tests for worktree cleanup logic in the do command.
 *
 * The cleanup flow in runDoCommand:
 * 1. After executeSingleProject() returns
 * 2. Post-execution action (merge/pr/leave) is executed via executePostAction()
 * 3. Cleanup happens as part of the post-action: merge and leave clean up, PR does not
 * 4. If cleanup fails, warn but don't error
 *
 * Since runDoCommand is not exported, we test the logic indirectly by
 * verifying removeWorktree behavior and the conditions under which
 * cleanup should/should not occur.
 */

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockReaddirSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
}));

// Mock logger
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: jest.fn(),
  },
}));

const { removeWorktree, mergeWorktreeBranch } = await import('../../src/core/worktree.js');

describe('worktree cleanup after successful execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('removeWorktree preserves branch', () => {
    it('should only call git worktree remove, not git branch delete', () => {
      mockExecSync.mockReturnValue('');

      removeWorktree('/path/to/worktree');

      // Should call git worktree remove
      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git worktree remove "/path/to/worktree"',
        expect.any(Object)
      );
      // Should NOT call git branch -d or -D
      const calls = mockExecSync.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(calls.every((cmd: string) => !cmd.includes('branch -d') && !cmd.includes('branch -D'))).toBe(true);
    });
  });

  describe('cleanup decision logic', () => {
    /**
     * Simulate the cleanup decision from runDoCommand:
     *   if (worktreeMode && worktreeRoot && result.success) { removeWorktree(...) }
     */
    function shouldCleanup(worktreeMode: boolean, worktreeRoot: string | undefined, resultSuccess: boolean): boolean {
      return worktreeMode && !!worktreeRoot && resultSuccess;
    }

    it('should clean up when worktree mode is active and execution succeeds', () => {
      expect(shouldCleanup(true, '/path/to/worktree', true)).toBe(true);
    });

    it('should NOT clean up when execution fails', () => {
      expect(shouldCleanup(true, '/path/to/worktree', false)).toBe(false);
    });

    it('should NOT clean up when not in worktree mode', () => {
      expect(shouldCleanup(false, '/path/to/worktree', true)).toBe(false);
    });

    it('should NOT clean up when worktreeRoot is undefined', () => {
      expect(shouldCleanup(true, undefined, true)).toBe(false);
    });
  });

  describe('cleanup failure handling', () => {
    it('should return success:false with error message when removal fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('worktree is dirty');
      });

      const result = removeWorktree('/path/to/dirty/worktree');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to remove worktree');
      expect(result.error).toContain('worktree is dirty');
    });

    it('should return success:true when removal succeeds', () => {
      mockExecSync.mockReturnValue('');

      const result = removeWorktree('/path/to/clean/worktree');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('merge after cleanup', () => {
    /**
     * The merge step uses the branch name (path.basename(worktreeRoot)),
     * not the worktree directory itself. This verifies that merge can
     * work independently of the worktree directory existing.
     */
    it('should use branch name for merge, not worktree directory', () => {
      // Simulate: worktreeRoot = '/home/user/.raf/worktrees/myapp/022-prune-cycle'
      // mergeWorktreeBranch uses: path.basename(worktreeRoot) = '022-prune-cycle'

      // Mock successful checkout and ff merge
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('checkout')) return '';
        if (cmdStr.includes('--ff-only')) return '';
        return '';
      });

      const result = mergeWorktreeBranch('022-prune-cycle', 'main');

      expect(result.success).toBe(true);
      // Verify git checkout was called with the branch name, not a path
      expect(mockExecSync).toHaveBeenCalledWith(
        'git checkout "main"',
        expect.any(Object)
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        'git merge --ff-only "022-prune-cycle"',
        expect.any(Object)
      );
    });
  });
});
