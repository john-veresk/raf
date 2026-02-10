import { jest } from '@jest/globals';
import * as path from 'node:path';

// Mock child_process before importing the module
const mockExecSync = jest.fn();
const mockSpawn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
  spawn: mockSpawn,
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockUnlinkSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
}));

// Mock os
const mockTmpdir = jest.fn().mockReturnValue('/tmp');
const mockHomedir = jest.fn().mockReturnValue('/home/testuser');
jest.unstable_mockModule('node:os', () => ({
  tmpdir: mockTmpdir,
  homedir: mockHomedir,
}));

// Mock logger to prevent console output
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
const {
  isGhInstalled,
  isGhAuthenticated,
  isGitHubRemote,
  isBranchPushed,
  pushBranch,
  detectBaseBranch,
  prPreflight,
  generatePrTitle,
  readProjectContext,
  generatePrBody,
  createPullRequest,
  filterClaudeOutput,
} = await import('../../src/core/pull-request.js');

describe('pull-request utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTmpdir.mockReturnValue('/tmp');
  });

  describe('isGhInstalled', () => {
    it('should return true when gh is installed', () => {
      mockExecSync.mockReturnValue('gh version 2.40.0');
      expect(isGhInstalled()).toBe(true);
    });

    it('should return false when gh is not installed', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('command not found: gh');
      });
      expect(isGhInstalled()).toBe(false);
    });
  });

  describe('isGhAuthenticated', () => {
    it('should return true when gh is authenticated', () => {
      mockExecSync.mockReturnValue('Logged in to github.com');
      expect(isGhAuthenticated()).toBe(true);
    });

    it('should return false when gh is not authenticated', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not logged in');
      });
      expect(isGhAuthenticated()).toBe(false);
    });
  });

  describe('isGitHubRemote', () => {
    it('should return true for github.com SSH remote', () => {
      mockExecSync.mockReturnValue('git@github.com:user/repo.git\n');
      expect(isGitHubRemote()).toBe(true);
    });

    it('should return true for github.com HTTPS remote', () => {
      mockExecSync.mockReturnValue('https://github.com/user/repo.git\n');
      expect(isGitHubRemote()).toBe(true);
    });

    it('should return false for non-GitHub remote', () => {
      mockExecSync.mockReturnValue('git@gitlab.com:user/repo.git\n');
      expect(isGitHubRemote()).toBe(false);
    });

    it('should return false when no remote exists', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('No such remote');
      });
      expect(isGitHubRemote()).toBe(false);
    });

    it('should pass cwd when provided', () => {
      mockExecSync.mockReturnValue('git@github.com:user/repo.git\n');
      isGitHubRemote('/some/worktree');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git remote get-url origin',
        expect.objectContaining({ cwd: '/some/worktree' }),
      );
    });
  });

  describe('isBranchPushed', () => {
    it('should return true when branch exists on remote', () => {
      mockExecSync.mockReturnValue('abc123\trefs/heads/my-branch\n');
      expect(isBranchPushed('my-branch')).toBe(true);
    });

    it('should return false when branch does not exist on remote', () => {
      mockExecSync.mockReturnValue('');
      expect(isBranchPushed('my-branch')).toBe(false);
    });

    it('should return false when command fails', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });
      expect(isBranchPushed('my-branch')).toBe(false);
    });
  });

  describe('pushBranch', () => {
    it('should return true on successful push', () => {
      mockExecSync.mockReturnValue('');
      expect(pushBranch('my-branch')).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'git push -u origin "my-branch"',
        expect.any(Object),
      );
    });

    it('should return false on push failure', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('push failed');
      });
      expect(pushBranch('my-branch')).toBe(false);
    });

    it('should pass cwd when provided', () => {
      mockExecSync.mockReturnValue('');
      pushBranch('my-branch', '/some/worktree');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git push -u origin "my-branch"',
        expect.objectContaining({ cwd: '/some/worktree' }),
      );
    });
  });

  describe('detectBaseBranch', () => {
    it('should detect base branch from remote HEAD', () => {
      mockExecSync.mockReturnValue('refs/remotes/origin/main\n');
      expect(detectBaseBranch()).toBe('main');
    });

    it('should detect master from remote HEAD', () => {
      mockExecSync.mockReturnValue('refs/remotes/origin/master\n');
      expect(detectBaseBranch()).toBe('master');
    });

    it('should fall back to checking main branch existence', () => {
      let callCount = 0;
      mockExecSync.mockImplementation((cmd: unknown) => {
        callCount++;
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) {
          throw new Error('not set');
        }
        if (cmdStr.includes('refs/heads/main')) {
          return '';
        }
        throw new Error('no such ref');
      });
      expect(detectBaseBranch()).toBe('main');
    });

    it('should fall back to master if main does not exist', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('symbolic-ref')) {
          throw new Error('not set');
        }
        if (cmdStr.includes('refs/heads/main')) {
          throw new Error('no such ref');
        }
        if (cmdStr.includes('refs/heads/master')) {
          return '';
        }
        throw new Error('no such ref');
      });
      expect(detectBaseBranch()).toBe('master');
    });

    it('should return null when no base branch is found', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not found');
      });
      expect(detectBaseBranch()).toBeNull();
    });
  });

  describe('prPreflight', () => {
    it('should return ready=true when all checks pass', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        return '';
      });

      const result = prPreflight('my-branch');
      expect(result.ready).toBe(true);
      expect(result.ghInstalled).toBe(true);
      expect(result.ghAuthenticated).toBe(true);
      expect(result.isGitHubRemote).toBe(true);
      expect(result.branchPushed).toBe(true);
    });

    it('should fail if gh is not installed', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) throw new Error('not found');
        return '';
      });

      const result = prPreflight('my-branch');
      expect(result.ready).toBe(false);
      expect(result.ghInstalled).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should fail if gh is not authenticated', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) throw new Error('not logged in');
        return '';
      });

      const result = prPreflight('my-branch');
      expect(result.ready).toBe(false);
      expect(result.ghAuthenticated).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('should fail if remote is not GitHub', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@gitlab.com:user/repo.git';
        return '';
      });

      const result = prPreflight('my-branch');
      expect(result.ready).toBe(false);
      expect(result.isGitHubRemote).toBe(false);
      expect(result.error).toContain('not a GitHub');
    });

    it('should be ready even if branch is not yet pushed', () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return '';
        return '';
      });

      const result = prPreflight('my-branch');
      expect(result.ready).toBe(true);
      expect(result.branchPushed).toBe(false);
    });
  });

  describe('generatePrTitle', () => {
    it('should convert project name to human-readable title', () => {
      expect(generatePrTitle('/path/to/RAF/acbfhg-merge-guardian')).toBe('Merge guardian');
    });

    it('should capitalize first word only', () => {
      expect(generatePrTitle('/path/to/RAF/aabcde-fix-login-bug')).toBe('Fix login bug');
    });

    it('should handle single-word names', () => {
      expect(generatePrTitle('/path/to/RAF/aabcde-refactoring')).toBe('Refactoring');
    });

    it('should return fallback for invalid path', () => {
      expect(generatePrTitle('/path/to/invalid')).toBe('Feature branch');
    });
  });

  describe('readProjectContext', () => {
    const projectPath = '/path/to/RAF/acbfhg-merge-guardian';

    it('should read input.md, decisions.md, and outcomes', () => {
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return true;
        if (pStr.endsWith('decisions.md')) return true;
        if (pStr.endsWith('outcomes')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return 'Build a feature';
        if (pStr.endsWith('decisions.md')) return '# Decisions\nUse React';
        if (pStr.endsWith('01-setup.md')) return '# Setup complete\n<promise>COMPLETE</promise>';
        return '';
      });

      mockReaddirSync.mockReturnValue(['01-setup.md', '02-implement.md']);

      const context = readProjectContext(projectPath);

      expect(context.input).toBe('Build a feature');
      expect(context.decisions).toBe('# Decisions\nUse React');
      expect(context.outcomes.length).toBe(2);
      expect(context.outcomes[0]!.taskId).toBe('01');
    });

    it('should handle missing input.md', () => {
      mockExistsSync.mockReturnValue(false);

      const context = readProjectContext(projectPath);

      expect(context.input).toBeNull();
      expect(context.decisions).toBeNull();
      expect(context.outcomes).toEqual([]);
    });

    it('should handle outcomes directory with no matching files', () => {
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('outcomes')) return true;
        return false;
      });

      mockReaddirSync.mockReturnValue(['README.md', '.gitkeep']);

      const context = readProjectContext(projectPath);

      expect(context.outcomes).toEqual([]);
    });
  });

  describe('filterClaudeOutput', () => {
    it('should pass through clean markdown', () => {
      const input = '## Summary\n- Added a feature\n\n## Test Plan\n- Run tests';
      expect(filterClaudeOutput(input)).toBe(input);
    });

    it('should remove warning emoji lines', () => {
      const input = '⚠ Some warning\n## Summary\n- Feature added';
      expect(filterClaudeOutput(input)).toBe('## Summary\n- Feature added');
    });

    it('should remove [warn] prefixed lines', () => {
      const input = '[warn] something happened\n## Summary\nContent here';
      expect(filterClaudeOutput(input)).toBe('## Summary\nContent here');
    });

    it('should remove console.warn lines', () => {
      const input = 'console.warn: deprecation notice\n## Summary\n- Done';
      expect(filterClaudeOutput(input)).toBe('## Summary\n- Done');
    });

    it('should remove Note: lines', () => {
      const input = 'Note: using fallback\n## Summary\n- Changes';
      expect(filterClaudeOutput(input)).toBe('## Summary\n- Changes');
    });

    it('should remove Loading/Connecting/Processing lines', () => {
      const input = 'Loading model...\nConnecting to API\n## Summary\n- Done';
      expect(filterClaudeOutput(input)).toBe('## Summary\n- Done');
    });

    it('should remove lines with progress indicators', () => {
      const input = '› Initializing\n> Running\n## Summary\n- Feature';
      expect(filterClaudeOutput(input)).toBe('## Summary\n- Feature');
    });

    it('should handle empty input', () => {
      expect(filterClaudeOutput('')).toBe('');
    });

    it('should handle input that is all log lines', () => {
      const input = '⚠ warning\n[info] starting\nLoading data';
      expect(filterClaudeOutput(input)).toBe('');
    });

    it('should preserve blank lines between markdown sections', () => {
      const input = '## Summary\nContent\n\n## Test Plan\nVerify';
      expect(filterClaudeOutput(input)).toBe(input);
    });
  });

  describe('generatePrBody', () => {
    it('should return fallback body when no context is available', async () => {
      mockExistsSync.mockReturnValue(false);

      const body = await generatePrBody('/path/to/RAF/acbfhg-project');

      expect(body).toContain('## Summary');
      expect(body).toContain('## Key Decisions');
      expect(body).toContain('## What Was Done');
      expect(body).toContain('## Test Plan');
    });

    it('should return fallback body with all 4 sections when outcomes exist', async () => {
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return true;
        if (pStr.endsWith('decisions.md')) return false;
        if (pStr.endsWith('outcomes')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return 'Add dark mode toggle';
        if (pStr.endsWith('01-task.md')) return 'Done';
        return '';
      });

      mockReaddirSync.mockReturnValue(['01-task.md']);

      // Mock spawn to fail (forcing fallback)
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which claude')) throw new Error('not found');
        return '';
      });

      const body = await generatePrBody('/path/to/RAF/acbfhg-project');

      expect(body).toContain('## Summary');
      expect(body).toContain('Add dark mode toggle');
      expect(body).toContain('## Key Decisions');
      expect(body).toContain('No decisions recorded');
      expect(body).toContain('## What Was Done');
      expect(body).toContain('1 task(s) completed');
      expect(body).toContain('## Test Plan');
    });

    it('should include prompt with 4-section structure', async () => {
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return true;
        if (pStr.endsWith('decisions.md')) return false;
        if (pStr.endsWith('outcomes')) return false;
        return false;
      });

      mockReadFileSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return 'Some feature';
        return '';
      });

      // Capture the prompt passed to Claude
      let capturedPrompt = '';
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which claude')) return '/usr/local/bin/claude';
        return '';
      });

      // Mock spawn to capture prompt
      const mockProc = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProc);

      // Start the promise but don't await yet
      const bodyPromise = generatePrBody('/path/to/RAF/acbfhg-project');

      // Get the prompt from spawn args
      const spawnArgs = mockSpawn.mock.calls[0] as unknown[];
      const args = spawnArgs[1] as string[];
      capturedPrompt = args[args.length - 1]!;

      // Simulate successful Claude response
      const closeHandler = (mockProc.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'close',
      );
      const stdoutHandler = (mockProc.stdout.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'data',
      );

      // Emit data then close
      (stdoutHandler![1] as (data: Buffer) => void)(Buffer.from('## Summary\nTest\n\n## Key Decisions\n- Decision\n\n## What Was Done\n- Work\n\n## Test Plan\n- Verify'));
      (closeHandler![1] as (code: number) => void)(0);

      await bodyPromise;

      // Verify prompt structure
      expect(capturedPrompt).toContain('## Summary');
      expect(capturedPrompt).toContain('## Key Decisions');
      expect(capturedPrompt).toContain('## What Was Done');
      expect(capturedPrompt).toContain('## Test Plan');
    });

    it('should use sonnet model', async () => {
      mockExistsSync.mockImplementation((p: unknown) => {
        const pStr = p as string;
        if (pStr.endsWith('input.md')) return true;
        return false;
      });

      mockReadFileSync.mockImplementation(() => 'Feature input');

      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('which claude')) return '/usr/local/bin/claude';
        return '';
      });

      const mockProc = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProc);

      const bodyPromise = generatePrBody('/path/to/RAF/acbfhg-project');

      // Verify spawn was called with sonnet model
      const spawnArgs = mockSpawn.mock.calls[0] as unknown[];
      const args = spawnArgs[1] as string[];
      expect(args).toContain('--model');
      expect(args).toContain('sonnet');

      // Close the process to resolve the promise
      const closeHandler = (mockProc.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'close',
      );
      const stdoutHandler = (mockProc.stdout.on as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'data',
      );

      (stdoutHandler![1] as (data: Buffer) => void)(Buffer.from('## Summary\nContent'));
      (closeHandler![1] as (code: number) => void)(0);

      await bodyPromise;
    });
  });

  describe('createPullRequest', () => {
    it('should fail if preflight checks fail', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) throw new Error('not found');
        return '';
      });

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should fail if base branch cannot be detected', async () => {
      // All preflight checks pass
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        // Base branch detection fails
        throw new Error('not found');
      });

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('base branch');
    });

    it('should push branch if not already pushed', async () => {
      let pushCalled = false;
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return ''; // not pushed
        if (cmdStr.includes('git push -u origin')) { pushCalled = true; return ''; }
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) return 'https://github.com/user/repo/pull/1\n';
        return '';
      });

      // Mock fs for generatePrBody fallback
      mockExistsSync.mockReturnValue(false);

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(pushCalled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.prUrl).toBe('https://github.com/user/repo/pull/1');
    });

    it('should fail if push fails', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return ''; // not pushed
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('git push -u origin')) throw new Error('permission denied');
        return '';
      });

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to push');
    });

    it('should use --body-file with temp file instead of --body', async () => {
      let ghPrCmd = '';
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) {
          ghPrCmd = cmdStr;
          return 'https://github.com/user/repo/pull/42\n';
        }
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(ghPrCmd).toContain('--body-file');
      expect(ghPrCmd).not.toContain('--body "');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/raf-pr-body-'),
        expect.any(String),
        'utf-8',
      );
    });

    it('should clean up temp file after successful PR creation', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) return 'https://github.com/user/repo/pull/1\n';
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/raf-pr-body-'),
      );
    });

    it('should clean up temp file even on PR creation failure', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) throw new Error('PR already exists');
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/raf-pr-body-'),
      );
    });

    it('should create PR successfully with all checks passing', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch'; // already pushed
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) return 'https://github.com/user/repo/pull/42\n';
        return '';
      });

      // Mock fs for generatePrBody fallback
      mockExistsSync.mockReturnValue(false);

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(result.success).toBe(true);
      expect(result.prUrl).toBe('https://github.com/user/repo/pull/42');
    });

    it('should use explicit base branch when provided', async () => {
      let ghPrCmd = '';
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) {
          ghPrCmd = cmdStr;
          return 'https://github.com/user/repo/pull/1\n';
        }
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project', {
        baseBranch: 'develop',
      });

      expect(ghPrCmd).toContain('--base "develop"');
    });

    it('should use custom title when provided', async () => {
      let ghPrCmd = '';
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) {
          ghPrCmd = cmdStr;
          return 'https://github.com/user/repo/pull/1\n';
        }
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project', {
        title: 'My custom PR title',
      });

      expect(ghPrCmd).toContain('--title "My custom PR title"');
    });

    it('should handle gh pr create failure', async () => {
      mockExecSync.mockImplementation((cmd: unknown) => {
        const cmdStr = cmd as string;
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) throw new Error('a]pull request already exists');
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      const result = await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create PR');
    });

    it('should pass cwd to git commands', async () => {
      const cwdCalls: string[] = [];
      mockExecSync.mockImplementation((cmd: unknown, opts: unknown) => {
        const cmdStr = cmd as string;
        const options = opts as { cwd?: string } | undefined;
        if (options?.cwd) {
          cwdCalls.push(cmdStr);
        }
        if (cmdStr.includes('gh --version')) return 'gh version 2.40.0';
        if (cmdStr.includes('gh auth status')) return 'Logged in';
        if (cmdStr.includes('git remote get-url')) return 'git@github.com:user/repo.git';
        if (cmdStr.includes('git ls-remote')) return 'abc123\trefs/heads/my-branch';
        if (cmdStr.includes('symbolic-ref')) return 'refs/remotes/origin/main\n';
        if (cmdStr.includes('which claude')) throw new Error('not found');
        if (cmdStr.includes('gh pr create')) return 'https://github.com/user/repo/pull/1\n';
        return '';
      });

      mockExistsSync.mockReturnValue(false);

      await createPullRequest('my-branch', '/path/to/RAF/acbfhg-project', {
        cwd: '/worktree/path',
      });

      // Git commands that accept cwd should have received it
      expect(cwdCalls.some(c => c.includes('git remote get-url'))).toBe(true);
      expect(cwdCalls.some(c => c.includes('git ls-remote'))).toBe(true);
      expect(cwdCalls.some(c => c.includes('gh pr create'))).toBe(true);
    });
  });
});
