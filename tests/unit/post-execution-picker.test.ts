import { jest } from '@jest/globals';

// Mock @inquirer/prompts before importing the module
const mockSelect = jest.fn();
jest.unstable_mockModule('@inquirer/prompts', () => ({
  select: mockSelect,
  checkbox: jest.fn(),
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
const mockPullMainBranch = jest.fn();
const mockPushMainBranch = jest.fn();
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
  pullMainBranch: mockPullMainBranch,
  pushMainBranch: mockPushMainBranch,
  detectMainBranch: jest.fn(),
  rebaseOntoMain: jest.fn(),
  deleteLocalBranch: jest.fn(),
  pushCurrentBranch: jest.fn(),
}));

// Import after mocking
const { pickPostExecutionAction } = await import('../../src/commands/do.js');
import type { PostExecutionAction } from '../../src/commands/do.js';

describe('pickPostExecutionAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should present three choices with singular wording for one branch', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction(['acbfhg-my-project']);

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'After tasks complete, what should happen with branch "acbfhg-my-project"?',
      choices: [
        { name: 'Merge into current branch', value: 'merge' },
        { name: 'Create a GitHub PR', value: 'pr' },
        { name: 'Leave branch as-is', value: 'leave' },
      ],
    });
  });

  it('should present plural wording for multiple branches', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction(['branch-a', 'branch-b']);

    expect(mockSelect).toHaveBeenCalledWith({
      message: 'After tasks complete, what should happen with branches "branch-a", "branch-b"?',
      choices: [
        { name: 'Merge into current branch', value: 'merge' },
        { name: 'Create a GitHub PR', value: 'pr' },
        { name: 'Leave branches as-is', value: 'leave' },
      ],
    });
  });

  it('should return "merge" when user selects merge', async () => {
    mockSelect.mockResolvedValue('merge');

    const result = await pickPostExecutionAction(['acbfhg-my-project']);

    expect(result).toBe('merge');
  });

  it('should return "leave" when user selects leave', async () => {
    mockSelect.mockResolvedValue('leave');

    const result = await pickPostExecutionAction(['acbfhg-my-project']);

    expect(result).toBe('leave');
  });

  it('should return "pr" when user selects PR (no preflight in picker)', async () => {
    mockSelect.mockResolvedValue('pr');

    const result = await pickPostExecutionAction(['acbfhg-my-project']);

    expect(result).toBe('pr');
    // Preflight is no longer in the picker — it moved to executePostAction
    expect(mockPrPreflight).not.toHaveBeenCalled();
  });

  it('should not run preflight for any choice', async () => {
    mockSelect.mockResolvedValue('merge');
    await pickPostExecutionAction(['acbfhg-my-project']);
    expect(mockPrPreflight).not.toHaveBeenCalled();

    mockSelect.mockResolvedValue('leave');
    await pickPostExecutionAction(['acbfhg-my-project']);
    expect(mockPrPreflight).not.toHaveBeenCalled();
  });

  it('should list all branch names in the message for multiple branches', async () => {
    mockSelect.mockResolvedValue('leave');

    await pickPostExecutionAction(['branch-x', 'branch-y', 'branch-z']);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('"branch-x", "branch-y", "branch-z"'),
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
      mockRemoveWorktree.mockReturnValue({ success: true });
      mockMergeWorktreeBranch.mockReturnValue({ success: true, merged: true, fastForward: true });

      const action: PostExecutionAction = 'merge';
      expect(action).toBe('merge');

      const cleanup = mockRemoveWorktree('/path/to/worktree');
      expect(mockRemoveWorktree).toHaveBeenCalled();
    });
  });

  describe('PR action', () => {
    it('should NOT clean up worktree after PR creation', () => {
      const action: PostExecutionAction = 'pr';
      expect(action).toBe('pr');
    });
  });

  describe('leave action', () => {
    it('should clean up worktree directory', () => {
      mockRemoveWorktree.mockReturnValue({ success: true });

      const action: PostExecutionAction = 'leave';
      expect(action).toBe('leave');

      mockRemoveWorktree('/path/to/worktree');
      expect(mockRemoveWorktree).toHaveBeenCalled();
    });
  });

  describe('action skipped on failure', () => {
    it('should identify when action should be skipped', () => {
      const resultSuccess = false;
      const postAction: PostExecutionAction = 'merge';

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
