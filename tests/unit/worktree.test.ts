import { jest } from '@jest/globals';
import * as os from 'node:os';
import * as path from 'node:path';

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

// Mock logger to prevent console output
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
const {
  getRepoRoot,
  getRepoBasename,
  getCurrentBranch,
  computeWorktreePath,
  computeWorktreeBaseDir,
  getWorktreeProjectPath,
  createWorktree,
  createWorktreeFromBranch,
  branchExists,
  validateWorktree,
  mergeWorktreeBranch,
  removeWorktree,
  listWorktreeProjects,
  resolveWorktreeProjectByIdentifier,
  detectMainBranch,
  pullMainBranch,
  pushMainBranch,
} = await import('../../src/core/worktree.js');

const HOME = os.homedir();

describe('worktree utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRepoRoot', () => {
    it('should return the repo root path', () => {
      mockExecSync.mockReturnValue('/Users/me/projects/myapp\n');
      expect(getRepoRoot()).toBe('/Users/me/projects/myapp');
    });

    it('should return null when not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(getRepoRoot()).toBeNull();
    });

    it('should return null for empty output', () => {
      mockExecSync.mockReturnValue('');
      expect(getRepoRoot()).toBeNull();
    });
  });

  describe('getRepoBasename', () => {
    it('should return the basename of the repo root', () => {
      mockExecSync.mockReturnValue('/Users/me/projects/myapp\n');
      expect(getRepoBasename()).toBe('myapp');
    });

    it('should return null when not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(getRepoBasename()).toBeNull();
    });
  });

  describe('getCurrentBranch', () => {
    it('should return the current branch name', () => {
      mockExecSync.mockReturnValue('main\n');
      expect(getCurrentBranch()).toBe('main');
    });

    it('should return null in detached HEAD state', () => {
      mockExecSync.mockReturnValue('');
      expect(getCurrentBranch()).toBeNull();
    });

    it('should return null when not in a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(getCurrentBranch()).toBeNull();
    });
  });

  describe('computeWorktreePath', () => {
    it('should compute the correct worktree path', () => {
      const result = computeWorktreePath('myapp', 'abaaba-worktree-weaver');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'myapp', 'abaaba-worktree-weaver'));
    });

    it('should handle repo names with dots', () => {
      const result = computeWorktreePath('my.app.v2', 'aaaaab-feature');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'my.app.v2', 'aaaaab-feature'));
    });

    it('should handle repo names with underscores', () => {
      const result = computeWorktreePath('my_app', 'aaaaab-feature');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'my_app', 'aaaaab-feature'));
    });

    it('should handle repo names with hyphens', () => {
      const result = computeWorktreePath('my-cool-app', 'abcdef-my-project');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'my-cool-app', 'abcdef-my-project'));
    });

    it('should handle base26 project IDs', () => {
      const result = computeWorktreePath('myapp', 'abcdef-my-project');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'myapp', 'abcdef-my-project'));
    });
  });

  describe('computeWorktreeBaseDir', () => {
    it('should compute the correct base directory', () => {
      const result = computeWorktreeBaseDir('myapp');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'myapp'));
    });

    it('should handle repo names with special characters', () => {
      const result = computeWorktreeBaseDir('my.app_v2');
      expect(result).toBe(path.join(HOME, '.raf', 'worktrees', 'my.app_v2'));
    });
  });

  describe('getWorktreeProjectPath', () => {
    it('should return the project path inside the worktree', () => {
      const result = getWorktreeProjectPath('/worktree/root', 'RAF/abaaba-worktree-weaver');
      expect(result).toBe(path.join('/worktree/root', 'RAF/abaaba-worktree-weaver'));
    });

    it('should handle nested relative paths', () => {
      const result = getWorktreeProjectPath('/worktree/root', 'deep/nested/RAF/aaaaab-feature');
      expect(result).toBe(path.join('/worktree/root', 'deep/nested/RAF/aaaaab-feature'));
    });
  });

  describe('createWorktree', () => {
    it('should create parent directory and worktree successfully', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockExecSync.mockReturnValue('');

      const result = createWorktree('myapp', 'abaaba-worktree-weaver');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('abaaba-worktree-weaver');
      expect(result.worktreePath).toBe(
        path.join(HOME, '.raf', 'worktrees', 'myapp', 'abaaba-worktree-weaver')
      );
      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(HOME, '.raf', 'worktrees', 'myapp'),
        { recursive: true }
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object)
      );
    });

    it('should return error when parent directory creation fails', () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = createWorktree('myapp', 'abaaba-worktree-weaver');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create parent directory');
    });

    it('should return error when git worktree add fails', () => {
      mockMkdirSync.mockReturnValue(undefined);
      mockExecSync.mockImplementation(() => {
        throw new Error('branch already exists');
      });

      const result = createWorktree('myapp', 'abaaba-worktree-weaver');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create worktree');
    });
  });

  describe('validateWorktree', () => {
    const worktreePath = '/worktree/path';
    const projectRelPath = 'RAF/abaaba-worktree-weaver';

    it('should return exists=false when directory does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateWorktree(worktreePath, projectRelPath);

      expect(result.exists).toBe(false);
      expect(result.isValidWorktree).toBe(false);
    });

    it('should validate a fully valid worktree', () => {
      const resolvedPath = path.resolve(worktreePath);
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr === worktreePath) return true;
        if (pStr === path.join(worktreePath, projectRelPath)) return true;
        if (pStr === path.join(worktreePath, projectRelPath, 'plans')) return true;
        return false;
      });

      mockExecSync.mockReturnValue(`worktree ${resolvedPath}\nHEAD abc123\nbranch refs/heads/abaaba-worktree-weaver\n\n`);

      const result = validateWorktree(worktreePath, projectRelPath);

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(true);
      expect(result.hasProjectFolder).toBe(true);
      expect(result.hasPlans).toBe(true);
      expect(result.projectPath).toBe(path.join(worktreePath, projectRelPath));
    });

    it('should detect worktree not in git worktree list', () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('worktree /some/other/path\nHEAD abc123\n\n');

      const result = validateWorktree(worktreePath, projectRelPath);

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(false);
    });

    it('should detect missing project folder', () => {
      const resolvedPath = path.resolve(worktreePath);
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr === worktreePath) return true;
        return false;
      });

      mockExecSync.mockReturnValue(`worktree ${resolvedPath}\nHEAD abc123\n\n`);

      const result = validateWorktree(worktreePath, projectRelPath);

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(true);
      expect(result.hasProjectFolder).toBe(false);
      expect(result.hasPlans).toBe(false);
    });

    it('should handle git worktree list failure', () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = validateWorktree(worktreePath, projectRelPath);

      expect(result.exists).toBe(true);
      expect(result.isValidWorktree).toBe(false);
    });
  });

  describe('mergeWorktreeBranch', () => {
    it('should succeed with fast-forward merge', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('checkout')) return '';
        if (cmdStr.includes('--ff-only')) return '';
        return '';
      });

      const result = mergeWorktreeBranch('abaaba-worktree-weaver', 'main');

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(result.fastForward).toBe(true);
    });

    it('should fall back to merge commit when ff not possible', () => {
      let ffAttempted = false;
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('checkout')) return '';
        if (cmdStr.includes('--ff-only')) {
          ffAttempted = true;
          throw new Error('Not possible to fast-forward');
        }
        if (cmdStr.includes('git merge') && !cmdStr.includes('--abort') && ffAttempted) return '';
        return '';
      });

      const result = mergeWorktreeBranch('abaaba-worktree-weaver', 'main');

      expect(result.success).toBe(true);
      expect(result.merged).toBe(true);
      expect(result.fastForward).toBe(false);
    });

    it('should abort and return failure on merge conflicts', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('checkout')) return '';
        if (cmdStr.includes('--ff-only')) throw new Error('Not possible to fast-forward');
        if (cmdStr.includes('--abort')) return '';
        if (cmdStr.includes('git merge')) throw new Error('CONFLICT');
        return '';
      });

      const result = mergeWorktreeBranch('abaaba-worktree-weaver', 'main');

      expect(result.success).toBe(false);
      expect(result.merged).toBe(false);
      expect(result.error).toContain('manually');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git merge --abort',
        expect.any(Object)
      );
    });

    it('should return failure when checkout fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('pathspec "main" did not match');
      });

      const result = mergeWorktreeBranch('abaaba-worktree-weaver', 'main');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to checkout');
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree successfully', () => {
      mockExecSync.mockReturnValue('');

      const result = removeWorktree('/path/to/worktree');

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git worktree remove "/path/to/worktree"',
        expect.any(Object)
      );
    });

    it('should return error when removal fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('worktree is dirty');
      });

      const result = removeWorktree('/path/to/worktree');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to remove worktree');
    });
  });

  describe('branchExists', () => {
    it('should return true when branch exists', () => {
      mockExecSync.mockReturnValue('  abcabc-prune-cycle\n');
      expect(branchExists('abcabc-prune-cycle')).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git branch --list "abcabc-prune-cycle"',
        expect.any(Object)
      );
    });

    it('should return false when branch does not exist', () => {
      mockExecSync.mockReturnValue('');
      expect(branchExists('nonexistent-branch')).toBe(false);
    });

    it('should return false when git command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      expect(branchExists('any-branch')).toBe(false);
    });
  });

  describe('createWorktreeFromBranch', () => {
    it('should create worktree from existing branch successfully', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('git branch --list')) return '  abcabc-prune-cycle\n';
        return '';
      });
      mockMkdirSync.mockReturnValue(undefined);

      const result = createWorktreeFromBranch('myapp', 'abcabc-prune-cycle');

      expect(result.success).toBe(true);
      expect(result.branch).toBe('abcabc-prune-cycle');
      expect(result.worktreePath).toBe(
        path.join(HOME, '.raf', 'worktrees', 'myapp', 'abcabc-prune-cycle')
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object)
      );
      // Should NOT have -b flag
      const worktreeCall = mockExecSync.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('git worktree add')
      );
      expect(worktreeCall).toBeDefined();
      expect(worktreeCall![0]).not.toContain('-b');
    });

    it('should return error when branch does not exist', () => {
      mockExecSync.mockReturnValue('');

      const result = createWorktreeFromBranch('myapp', 'nonexistent-branch');

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist locally');
    });

    it('should return error when parent directory creation fails', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('git branch --list')) return '  abcabc-prune-cycle\n';
        return '';
      });
      mockMkdirSync.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = createWorktreeFromBranch('myapp', 'abcabc-prune-cycle');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create parent directory');
    });

    it('should return error when git worktree add fails', () => {
      let branchChecked = false;
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('git branch --list')) {
          branchChecked = true;
          return '  abcabc-prune-cycle\n';
        }
        if (cmdStr.includes('git worktree add') && branchChecked) {
          throw new Error('worktree path already exists');
        }
        return '';
      });
      mockMkdirSync.mockReturnValue(undefined);

      const result = createWorktreeFromBranch('myapp', 'abcabc-prune-cycle');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create worktree');
    });
  });

  describe('listWorktreeProjects', () => {
    it('should return empty array when base directory does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = listWorktreeProjects('myapp');

      expect(result).toEqual([]);
    });

    it('should return sorted list of project directories', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        { name: 'ababab-another-feature', isDirectory: () => true },
        { name: 'abaaba-worktree-weaver', isDirectory: () => true },
      ]);

      const result = listWorktreeProjects('myapp');

      expect(result).toEqual(['abaaba-worktree-weaver', 'ababab-another-feature']);
    });

    it('should filter out non-directory entries', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([
        { name: 'abaaba-worktree-weaver', isDirectory: () => true },
        { name: '.DS_Store', isDirectory: () => false },
      ]);

      const result = listWorktreeProjects('myapp');

      expect(result).toEqual(['abaaba-worktree-weaver']);
    });

    it('should return empty array when directory is empty', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      const result = listWorktreeProjects('myapp');

      expect(result).toEqual([]);
    });

    it('should handle readdir errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation(() => {
        throw new Error('permission denied');
      });

      const result = listWorktreeProjects('myapp');

      expect(result).toEqual([]);
    });
  });

  describe('resolveWorktreeProjectByIdentifier', () => {
    const worktreeDirs = [
      { name: 'ahrren-turbo-finder', isDirectory: () => true },
      { name: 'abcdef-cool-feature', isDirectory: () => true },
      { name: 'ghijkl-another-thing', isDirectory: () => true },
    ];

    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(worktreeDirs);
    });

    it('should resolve by full folder name (exact match)', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'ahrren-turbo-finder');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('ahrren-turbo-finder');
      expect(result!.worktreeRoot).toBe(
        path.join(HOME, '.raf', 'worktrees', 'myapp', 'ahrren-turbo-finder')
      );
    });

    it('should resolve by full folder name case-insensitively', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'Ahrren-Turbo-Finder');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('ahrren-turbo-finder');
    });

    it('should resolve by base26 prefix (6-char ID)', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'ahrren');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('ahrren-turbo-finder');
    });

    it('should resolve by base26 prefix for different project', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'abcdef');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('abcdef-cool-feature');
    });

    it('should resolve by project name', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'turbo-finder');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('ahrren-turbo-finder');
    });

    it('should resolve by project name case-insensitively', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'Turbo-Finder');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('ahrren-turbo-finder');
    });

    it('should return null when no match found', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when no worktree projects exist', () => {
      mockExistsSync.mockReturnValue(false);

      const result = resolveWorktreeProjectByIdentifier('myapp', 'turbo-finder');

      expect(result).toBeNull();
    });

    it('should return null for ambiguous name match (multiple projects with same name)', () => {
      mockReaddirSync.mockReturnValue([
        { name: 'ahrren-my-feature', isDirectory: () => true },
        { name: 'abcdef-my-feature', isDirectory: () => true },
      ]);

      const result = resolveWorktreeProjectByIdentifier('myapp', 'my-feature');

      // Ambiguous: two projects named "my-feature"
      expect(result).toBeNull();
    });

    it('should prefer full folder name match over name match', () => {
      // "abcdef-cool-feature" could match as full folder name
      const result = resolveWorktreeProjectByIdentifier('myapp', 'abcdef-cool-feature');

      expect(result).not.toBeNull();
      expect(result!.folder).toBe('abcdef-cool-feature');
    });

    it('should return correct worktreeRoot path', () => {
      const result = resolveWorktreeProjectByIdentifier('myapp', 'another-thing');

      expect(result).not.toBeNull();
      expect(result!.worktreeRoot).toBe(
        path.join(HOME, '.raf', 'worktrees', 'myapp', 'ghijkl-another-thing')
      );
    });
  });

  describe('detectMainBranch', () => {
    it('should detect main branch from origin/HEAD', () => {
      mockExecSync.mockReturnValue('refs/remotes/origin/main\n');
      expect(detectMainBranch()).toBe('main');
    });

    it('should detect master from origin/HEAD', () => {
      mockExecSync.mockReturnValue('refs/remotes/origin/master\n');
      expect(detectMainBranch()).toBe('master');
    });

    it('should fall back to main when origin/HEAD not set', () => {
      let callCount = 0;
      mockExecSync.mockImplementation((cmd: unknown) => {
        callCount++;
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) {
          throw new Error('ref refs/remotes/origin/HEAD is not a symbolic ref');
        }
        if (cmdStr.includes('refs/heads/main') && callCount === 2) {
          return 'valid\n';
        }
        throw new Error('fatal');
      });

      expect(detectMainBranch()).toBe('main');
    });

    it('should fall back to master when main does not exist', () => {
      let callCount = 0;
      mockExecSync.mockImplementation((cmd: unknown) => {
        callCount++;
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) {
          throw new Error('ref refs/remotes/origin/HEAD is not a symbolic ref');
        }
        if (cmdStr.includes('refs/heads/main')) {
          throw new Error('fatal: Needed a single revision');
        }
        if (cmdStr.includes('refs/heads/master') && callCount === 3) {
          return 'valid\n';
        }
        throw new Error('fatal');
      });

      expect(detectMainBranch()).toBe('master');
    });

    it('should return null when no main branch found', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(detectMainBranch()).toBeNull();
    });
  });

  describe('pullMainBranch', () => {
    it('should return error when main branch cannot be detected', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = pullMainBranch();

      expect(result.success).toBe(false);
      expect(result.mainBranch).toBeNull();
      expect(result.error).toContain('Could not detect main branch');
    });

    it('should fetch main when not on main branch', () => {
      let commands: string[] = [];
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        commands.push(cmdStr);
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'feature-branch\n';
        if (cmdStr.includes('fetch origin main:main')) return '';
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(true);
      expect(commands).toContain('git fetch origin main:main');
    });

    it('should warn when local main has diverged', () => {
      let commands: string[] = [];
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        commands.push(cmdStr);
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'feature-branch\n';
        if (cmdStr.includes('fetch origin main:main')) throw new Error('not fast-forward');
        if (cmdStr.includes('fetch origin main')) return '';
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(false);
      expect(result.error).toContain('diverged');
    });

    it('should fail when on main but has uncommitted changes', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'main\n';
        if (cmdStr.includes('status --porcelain')) return ' M file.ts\n';
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(false);
      expect(result.mainBranch).toBe('main');
      expect(result.error).toContain('uncommitted changes');
    });

    it('should pull successfully when on main with no changes', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'main\n';
        if (cmdStr.includes('status --porcelain')) return '';
        if (cmdStr.includes('fetch origin main')) return '';
        if (cmdStr.includes('merge --ff-only')) return 'Updating abc123..def456\n';
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(true);
    });

    it('should report no changes when already up to date', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'main\n';
        if (cmdStr.includes('status --porcelain')) return '';
        if (cmdStr.includes('fetch origin main')) return '';
        if (cmdStr.includes('merge --ff-only')) return 'Already up to date.\n';
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(false);
    });

    it('should fail when branch has diverged', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('branch --show-current')) return 'main\n';
        if (cmdStr.includes('status --porcelain')) return '';
        if (cmdStr.includes('fetch origin main')) return '';
        if (cmdStr.includes('merge --ff-only')) throw new Error('Not possible to fast-forward');
        return '';
      });

      const result = pullMainBranch();

      expect(result.success).toBe(false);
      expect(result.mainBranch).toBe('main');
      expect(result.error).toContain('diverged from origin');
    });
  });

  describe('pushMainBranch', () => {
    it('should return error when main branch cannot be detected', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = pushMainBranch();

      expect(result.success).toBe(false);
      expect(result.mainBranch).toBeNull();
      expect(result.error).toContain('Could not detect main branch');
    });

    it('should push main successfully', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('push origin main')) return '';
        return '';
      });

      const result = pushMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(true);
    });

    it('should report no changes when already up to date', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('push origin main')) throw new Error('Everything up-to-date');
        return '';
      });

      const result = pushMainBranch();

      expect(result.success).toBe(true);
      expect(result.mainBranch).toBe('main');
      expect(result.hadChanges).toBe(false);
    });

    it('should fail when push is rejected', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('push origin main')) throw new Error('rejected - non-fast-forward');
        return '';
      });

      const result = pushMainBranch();

      expect(result.success).toBe(false);
      expect(result.mainBranch).toBe('main');
      expect(result.error).toContain('Failed to push main');
    });
  });
});
