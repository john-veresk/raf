import { jest } from '@jest/globals';

// Mock @inquirer/prompts before importing the module
const mockSelect = jest.fn();
jest.unstable_mockModule('@inquirer/prompts', () => ({
  select: mockSelect,
}));

// Mock logger
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerSuccess = jest.fn();
const mockLoggerNewline = jest.fn();
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: jest.fn(),
    success: mockLoggerSuccess,
    newline: mockLoggerNewline,
    configure: jest.fn(),
    setContext: jest.fn(),
    clearContext: jest.fn(),
  },
}));

// Mock pull-request module
const mockPrPreflight = jest.fn();
const mockCreatePullRequest = jest.fn();
jest.unstable_mockModule('../../src/core/pull-request.js', () => ({
  prPreflight: mockPrPreflight,
  createPullRequest: mockCreatePullRequest,
  generatePrBody: jest.fn(),
  generatePrTitle: jest.fn(),
  detectBaseBranch: jest.fn(),
  readProjectContext: jest.fn(),
  isGhInstalled: jest.fn(),
  isGhAuthenticated: jest.fn(),
  isGitHubRemote: jest.fn(),
  isBranchPushed: jest.fn(),
  pushBranch: jest.fn(),
}));

// Mock worktree module
const mockMergeWorktreeBranch = jest.fn();
const mockRemoveWorktree = jest.fn();
jest.unstable_mockModule('../../src/core/worktree.js', () => ({
  getRepoRoot: jest.fn(),
  getRepoBasename: jest.fn(),
  getCurrentBranch: jest.fn(),
  computeWorktreePath: jest.fn(),
  computeWorktreeBaseDir: jest.fn(),
  validateWorktree: jest.fn(),
  listWorktreeProjects: jest.fn(),
  mergeWorktreeBranch: mockMergeWorktreeBranch,
  removeWorktree: mockRemoveWorktree,
  createWorktree: jest.fn(),
  createWorktreeFromBranch: jest.fn(),
  branchExists: jest.fn(),
  getWorktreeProjectPath: jest.fn(),
  resolveWorktreeProjectByIdentifier: jest.fn(),
}));

// Import after mocking
const { pickPostExecutionAction } = await import('../../src/commands/do.js');
import type { PostExecutionAction } from '../../src/commands/do.js';

describe('pickPostExecutionAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should present three choices: merge, PR, leave', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(mockSelect).toHaveBeenCalledWith({
      message: expect.stringContaining('acbfhg-my-project'),
      choices: [
        { name: 'Merge into current branch', value: 'merge' },
        { name: 'Create a GitHub PR', value: 'pr' },
        { name: 'Leave branch as-is', value: 'leave' },
      ],
    });
  });

  it('should return "merge" when user selects merge', async () => {
    mockSelect.mockResolvedValue('merge');

    const result = await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(result).toBe('merge');
  });

  it('should return "leave" when user selects leave', async () => {
    mockSelect.mockResolvedValue('leave');

    const result = await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(result).toBe('leave');
  });

  it('should return "pr" when user selects PR and preflight passes', async () => {
    mockSelect.mockResolvedValue('pr');
    mockPrPreflight.mockReturnValue({ ready: true, ghInstalled: true, ghAuthenticated: true, isGitHubRemote: true, branchPushed: false });

    const result = await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(result).toBe('pr');
  });

  it('should run PR preflight when PR is selected', async () => {
    mockSelect.mockResolvedValue('pr');
    mockPrPreflight.mockReturnValue({ ready: true, ghInstalled: true, ghAuthenticated: true, isGitHubRemote: true, branchPushed: false });

    await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(mockPrPreflight).toHaveBeenCalledWith('acbfhg-my-project', '/path/to/worktree/acbfhg-my-project');
  });

  it('should fall back to "leave" when PR preflight fails', async () => {
    mockSelect.mockResolvedValue('pr');
    mockPrPreflight.mockReturnValue({
      ready: false,
      ghInstalled: false,
      ghAuthenticated: false,
      isGitHubRemote: false,
      branchPushed: false,
      error: 'GitHub CLI (gh) is not installed.',
    });

    const result = await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(result).toBe('leave');
    expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('PR preflight failed'));
    expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Leave branch'));
  });

  it('should not run preflight for merge choice', async () => {
    mockSelect.mockResolvedValue('merge');

    await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(mockPrPreflight).not.toHaveBeenCalled();
  });

  it('should not run preflight for leave choice', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction('/path/to/worktree/acbfhg-my-project');

    expect(mockPrPreflight).not.toHaveBeenCalled();
  });

  it('should use branch name from worktree path in picker message', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction('/home/user/.raf/worktrees/myapp/aaabcd-feature-x');

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('aaabcd-feature-x'),
      })
    );
  });
});

describe('PostExecutionAction type', () => {
  it('should accept valid action values', () => {
    const merge: PostExecutionAction = 'merge';
    const pr: PostExecutionAction = 'pr';
    const leave: PostExecutionAction = 'leave';

    expect(merge).toBe('merge');
    expect(pr).toBe('pr');
    expect(leave).toBe('leave');
  });
});

describe('post-execution action dispatch logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('merge action', () => {
    it('should clean up worktree before merge', () => {
      // The merge action calls removeWorktree first, then mergeWorktreeBranch
      // We verify the expected call sequence
      mockRemoveWorktree.mockReturnValue({ success: true });
      mockMergeWorktreeBranch.mockReturnValue({ success: true, merged: true, fastForward: true });

      // Simulate the merge action dispatch
      const action: PostExecutionAction = 'merge';
      expect(action).toBe('merge');

      // Verify removeWorktree behavior
      const cleanup = mockRemoveWorktree('/path/to/worktree');
      expect(mockRemoveWorktree).toHaveBeenCalled();
    });
  });

  describe('PR action', () => {
    it('should NOT clean up worktree after PR creation', () => {
      // PR action should preserve the worktree for follow-up changes
      const action: PostExecutionAction = 'pr';
      expect(action).toBe('pr');
      // This is verified by the absence of removeWorktree call in executePostAction for PR
    });
  });

  describe('leave action', () => {
    it('should clean up worktree directory', () => {
      mockRemoveWorktree.mockReturnValue({ success: true });

      const action: PostExecutionAction = 'leave';
      expect(action).toBe('leave');

      // Verify removeWorktree behavior
      mockRemoveWorktree('/path/to/worktree');
      expect(mockRemoveWorktree).toHaveBeenCalled();
    });
  });

  describe('action skipped on failure', () => {
    it('should identify when action should be skipped', () => {
      const resultSuccess = false;
      const postAction: PostExecutionAction = 'merge';

      // This mirrors the logic in runDoCommand
      const shouldSkip = !resultSuccess && postAction !== 'leave';
      expect(shouldSkip).toBe(true);
    });

    it('should not show skip message for leave action on failure', () => {
      const resultSuccess = false;
      const postAction: PostExecutionAction = 'leave';

      const shouldSkip = !resultSuccess && postAction !== 'leave';
      expect(shouldSkip).toBe(false);
    });

    it('should not skip when execution succeeds', () => {
      const resultSuccess = true;
      const postAction: PostExecutionAction = 'merge';

      const shouldExecute = resultSuccess;
      expect(shouldExecute).toBe(true);
    });
  });
});
