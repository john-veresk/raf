import { jest } from '@jest/globals';
import * as path from 'node:path';

// Mock @inquirer/prompts before importing the module
const mockCheckbox = jest.fn();
jest.unstable_mockModule('@inquirer/prompts', () => ({
  checkbox: mockCheckbox,
}));

// Mock state-derivation module
const mockDiscoverProjects = jest.fn();
const mockDeriveProjectState = jest.fn();
const mockGetDerivedStats = jest.fn();
jest.unstable_mockModule('../../src/core/state-derivation.js', () => ({
  discoverProjects: mockDiscoverProjects,
  deriveProjectState: mockDeriveProjectState,
  getDerivedStats: mockGetDerivedStats,
}));

// Mock worktree module
const mockListWorktreeProjects = jest.fn();
const mockComputeWorktreePath = jest.fn();
jest.unstable_mockModule('../../src/core/worktree.js', () => ({
  listWorktreeProjects: mockListWorktreeProjects,
  computeWorktreePath: mockComputeWorktreePath,
}));

// Mock fs.existsSync for worktree path checks
const mockExistsSync = jest.fn();
jest.unstable_mockModule('node:fs', () => {
  const actualFs = jest.requireActual('node:fs') as typeof import('node:fs');
  return {
    ...actualFs,
    default: { ...actualFs, existsSync: mockExistsSync },
    existsSync: mockExistsSync,
  };
});

// Import after mocking
const { pickPendingProjects, getPendingProjects, formatProjectChoice, getPendingWorktreeProjects } = await import(
  '../../src/ui/project-picker.js'
);

describe('Project Picker', () => {
  const testRafDir = '/test/RAF';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingProjects', () => {
    it('should return empty array when no projects exist', () => {
      mockDiscoverProjects.mockReturnValue([]);

      const result = getPendingProjects(testRafDir);

      expect(result).toEqual([]);
      expect(mockDiscoverProjects).toHaveBeenCalledWith(testRafDir);
    });

    it('should filter out completed projects', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'completed-project', path: path.join(testRafDir, '1-completed-project') },
        { number: 2, name: 'pending-project', path: path.join(testRafDir, '2-pending-project') },
      ]);

      // First project is completed
      mockDeriveProjectState.mockImplementation((projectPath: string) => {
        if (projectPath.includes('1-completed')) {
          return { tasks: [{ status: 'completed' }], status: 'completed' };
        }
        return { tasks: [{ status: 'pending' }, { status: 'completed' }], status: 'executing' };
      });

      mockGetDerivedStats.mockImplementation((state: { tasks: Array<{ status: string }> }) => {
        const completed = state.tasks.filter((t) => t.status === 'completed').length;
        const pending = state.tasks.filter((t) => t.status === 'pending').length;
        const failed = state.tasks.filter((t) => t.status === 'failed').length;
        return { completed, pending, failed, total: state.tasks.length };
      });

      const result = getPendingProjects(testRafDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('pending-project');
    });

    it('should include projects with failed tasks', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'failed-project', path: path.join(testRafDir, '1-failed-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'completed' }, { status: 'failed' }],
        status: 'failed',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 1,
        pending: 0,
        failed: 1,
        total: 2,
      });

      const result = getPendingProjects(testRafDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('failed-project');
      expect(result[0]!.completedTasks).toBe(1);
      expect(result[0]!.totalTasks).toBe(2);
    });

    it('should include projects with pending tasks', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'ready-project', path: path.join(testRafDir, '1-ready-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }, { status: 'pending' }, { status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 3,
        failed: 0,
        total: 3,
      });

      const result = getPendingProjects(testRafDir);

      expect(result).toHaveLength(1);
      expect(result[0]!.completedTasks).toBe(0);
      expect(result[0]!.totalTasks).toBe(3);
    });

    it('should sort projects by number (oldest first)', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 5, name: 'newer-project', path: path.join(testRafDir, '5-newer-project') },
        { number: 2, name: 'older-project', path: path.join(testRafDir, '2-older-project') },
        { number: 10, name: 'newest-project', path: path.join(testRafDir, '10-newest-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      const result = getPendingProjects(testRafDir);

      expect(result).toHaveLength(3);
      expect(result[0]!.number).toBe(2);
      expect(result[1]!.number).toBe(5);
      expect(result[2]!.number).toBe(10);
    });

    it('should include folder name in project info', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 3, name: 'my-project', path: path.join(testRafDir, '3-my-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      const result = getPendingProjects(testRafDir);

      expect(result[0]!.folder).toBe('3-my-project');
    });

    it('should set source to local for all projects', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'my-project', path: path.join(testRafDir, '1-my-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      const result = getPendingProjects(testRafDir);

      expect(result[0]!.source).toBe('local');
      expect(result[0]!.worktreeRoot).toBeUndefined();
    });
  });

  describe('formatProjectChoice', () => {
    it('should format project with number, name, and task progress', () => {
      const project = {
        folder: '1-fix-auth-bug',
        number: 1,
        name: 'fix-auth-bug',
        path: path.join(testRafDir, '1-fix-auth-bug'),
        completedTasks: 2,
        totalTasks: 5,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('1 fix-auth-bug (2/5 tasks)');
    });

    it('should format project with zero completed tasks', () => {
      const project = {
        folder: '3-new-feature',
        number: 3,
        name: 'new-feature',
        path: path.join(testRafDir, '3-new-feature'),
        completedTasks: 0,
        totalTasks: 3,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('3 new-feature (0/3 tasks)');
    });

    it('should format project with single task', () => {
      const project = {
        folder: '10-quick-fix',
        number: 10,
        name: 'quick-fix',
        path: path.join(testRafDir, '10-quick-fix'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('10 quick-fix (0/1 tasks)');
    });

    it('should append [worktree] suffix for worktree projects', () => {
      const project = {
        folder: '1-my-feature',
        number: 1,
        name: 'my-feature',
        path: '/worktrees/myapp/1-my-feature/RAF/1-my-feature',
        completedTasks: 2,
        totalTasks: 5,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/1-my-feature',
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('1 my-feature (2/5 tasks) [worktree]');
    });

    it('should not append [worktree] suffix for local projects', () => {
      const project = {
        folder: '1-local-project',
        number: 1,
        name: 'local-project',
        path: path.join(testRafDir, '1-local-project'),
        completedTasks: 0,
        totalTasks: 3,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).not.toContain('[worktree]');
    });
  });

  describe('getPendingWorktreeProjects', () => {
    it('should return empty array when no worktree projects exist', () => {
      mockListWorktreeProjects.mockReturnValue([]);

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toEqual([]);
    });

    it('should return pending worktree projects with correct metadata', () => {
      mockListWorktreeProjects.mockReturnValue(['1-my-feature']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/1-my-feature');
      mockExistsSync.mockReturnValue(true);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'completed' }, { status: 'pending' }],
        status: 'executing',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 1,
        pending: 1,
        failed: 0,
        total: 2,
      });

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toHaveLength(1);
      expect(result[0]!.folder).toBe('1-my-feature');
      expect(result[0]!.name).toBe('my-feature');
      expect(result[0]!.source).toBe('worktree');
      expect(result[0]!.worktreeRoot).toBe('/worktrees/myapp/1-my-feature');
      expect(result[0]!.completedTasks).toBe(1);
      expect(result[0]!.totalTasks).toBe(2);
    });

    it('should skip completed worktree projects', () => {
      mockListWorktreeProjects.mockReturnValue(['1-done-project']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/1-done-project');
      mockExistsSync.mockReturnValue(true);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'completed' }],
        status: 'completed',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 1,
        pending: 0,
        failed: 0,
        total: 1,
      });

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toEqual([]);
    });

    it('should skip worktree projects with invalid folder names', () => {
      mockListWorktreeProjects.mockReturnValue(['not-a-valid-project']);

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toEqual([]);
    });

    it('should skip worktree projects whose path does not exist', () => {
      mockListWorktreeProjects.mockReturnValue(['1-missing-project']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/1-missing-project');
      mockExistsSync.mockReturnValue(false);

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toEqual([]);
    });
  });

  describe('pickPendingProjects', () => {
    it('should return empty array when no pending projects exist', async () => {
      mockDiscoverProjects.mockReturnValue([]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([]);
      expect(mockCheckbox).not.toHaveBeenCalled();
    });

    it('should display pending projects as choices and return PickerResult[]', async () => {
      const firstProject = {
        folder: '1-first-project',
        number: 1,
        name: 'first-project',
        path: path.join(testRafDir, '1-first-project'),
        completedTasks: 1,
        totalTasks: 2,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'first-project', path: path.join(testRafDir, '1-first-project') },
        { number: 2, name: 'second-project', path: path.join(testRafDir, '2-second-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }, { status: 'completed' }],
        status: 'executing',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 1,
        pending: 1,
        failed: 0,
        total: 2,
      });

      mockCheckbox.mockResolvedValue([firstProject]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([{
        folder: '1-first-project',
        source: 'local',
        worktreeRoot: undefined,
      }]);
    });

    it('should return multiple selected projects', async () => {
      const project1 = {
        folder: '1-first-project',
        number: 1,
        name: 'first-project',
        path: path.join(testRafDir, '1-first-project'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      const project2 = {
        folder: '5-my-project',
        number: 5,
        name: 'my-project',
        path: path.join(testRafDir, '5-my-project'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'first-project', path: path.join(testRafDir, '1-first-project') },
        { number: 5, name: 'my-project', path: path.join(testRafDir, '5-my-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      mockCheckbox.mockResolvedValue([project1, project2]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([
        { folder: '1-first-project', source: 'local', worktreeRoot: undefined },
        { folder: '5-my-project', source: 'local', worktreeRoot: undefined },
      ]);
    });

    it('should return empty array when no projects selected', async () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'test-project', path: path.join(testRafDir, '1-test-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      mockCheckbox.mockResolvedValue([]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([]);
    });

    it('should format choices with task progress', async () => {
      const testProject = {
        folder: '1-test-project',
        number: 1,
        name: 'test-project',
        path: path.join(testRafDir, '1-test-project'),
        completedTasks: 1,
        totalTasks: 3,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'test-project', path: path.join(testRafDir, '1-test-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'completed' }, { status: 'pending' }, { status: 'pending' }],
        status: 'executing',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 1,
        pending: 2,
        failed: 0,
        total: 3,
      });

      mockCheckbox.mockResolvedValue([testProject]);

      await pickPendingProjects(testRafDir);

      expect(mockCheckbox).toHaveBeenCalledWith({
        message: 'Select projects to execute (space to toggle, enter to confirm):',
        choices: [
          {
            name: '1 test-project (1/3 tasks)',
            value: testProject,
          },
        ],
      });
    });

    it('should handle single pending project', async () => {
      const onlyProject = {
        folder: '7-only-project',
        number: 7,
        name: 'only-project',
        path: path.join(testRafDir, '7-only-project'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 7, name: 'only-project', path: path.join(testRafDir, '7-only-project') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'failed' }],
        status: 'failed',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 0,
        failed: 1,
        total: 1,
      });

      mockCheckbox.mockResolvedValue([onlyProject]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([{
        folder: '7-only-project',
        source: 'local',
        worktreeRoot: undefined,
      }]);
      expect(mockCheckbox).toHaveBeenCalledTimes(1);
    });

    it('should merge worktree projects into picker choices', async () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'local-proj', path: path.join(testRafDir, '1-local-proj') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 2,
      });

      const worktreeProject = {
        folder: '2-wt-proj',
        number: 2,
        name: 'wt-proj',
        path: '/worktrees/myapp/2-wt-proj/RAF/2-wt-proj',
        completedTasks: 1,
        totalTasks: 3,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/2-wt-proj',
      };

      mockCheckbox.mockResolvedValue([worktreeProject]);

      const result = await pickPendingProjects(testRafDir, [worktreeProject]);

      // Should have been called with both local and worktree projects
      expect(mockCheckbox).toHaveBeenCalledWith({
        message: 'Select projects to execute (space to toggle, enter to confirm):',
        choices: expect.arrayContaining([
          expect.objectContaining({ name: expect.stringContaining('local-proj') }),
          expect.objectContaining({ name: expect.stringContaining('[worktree]') }),
        ]),
      });

      expect(result).toEqual([{
        folder: '2-wt-proj',
        source: 'worktree',
        worktreeRoot: '/worktrees/myapp/2-wt-proj',
      }]);
    });

    it('should deduplicate projects when same folder exists in local and worktree (prefer worktree)', async () => {
      const worktreeVersion = {
        folder: '1-shared-proj',
        number: 1,
        name: 'shared-proj',
        path: '/worktrees/myapp/1-shared-proj/RAF/1-shared-proj',
        completedTasks: 2,
        totalTasks: 3,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/1-shared-proj',
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'shared-proj', path: path.join(testRafDir, '1-shared-proj') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      mockCheckbox.mockResolvedValue([worktreeVersion]);

      await pickPendingProjects(testRafDir, [worktreeVersion]);

      // Should have only 1 choice (deduplicated), and it should be the worktree version
      const checkboxCall = mockCheckbox.mock.calls[0] as [{ choices: Array<{ name: string; value: { source: string } }> }];
      expect(checkboxCall[0].choices).toHaveLength(1);
      expect(checkboxCall[0].choices[0]!.value.source).toBe('worktree');
    });

    it('should sort mixed local and worktree projects chronologically', async () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 5, name: 'later-local', path: path.join(testRafDir, '5-later-local') },
        { number: 1, name: 'early-local', path: path.join(testRafDir, '1-early-local') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      const worktreeProject = {
        folder: '3-mid-worktree',
        number: 3,
        name: 'mid-worktree',
        path: '/worktrees/myapp/3-mid-worktree/RAF/3-mid-worktree',
        completedTasks: 0,
        totalTasks: 2,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/3-mid-worktree',
      };

      const earlyLocal = {
        folder: '1-early-local',
        number: 1,
        name: 'early-local',
        path: path.join(testRafDir, '1-early-local'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockCheckbox.mockResolvedValue([earlyLocal]);

      await pickPendingProjects(testRafDir, [worktreeProject]);

      const checkboxCall = mockCheckbox.mock.calls[0] as [{ choices: Array<{ name: string; value: { number: number } }> }];
      const numbers = checkboxCall[0].choices.map((c) => c.value.number);
      expect(numbers).toEqual([1, 3, 5]);
    });

    it('should work with no worktree projects', async () => {
      const localProject = {
        folder: '1-solo',
        number: 1,
        name: 'solo',
        path: path.join(testRafDir, '1-solo'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'solo', path: path.join(testRafDir, '1-solo') },
      ]);

      mockDeriveProjectState.mockReturnValue({
        tasks: [{ status: 'pending' }],
        status: 'ready',
      });

      mockGetDerivedStats.mockReturnValue({
        completed: 0,
        pending: 1,
        failed: 0,
        total: 1,
      });

      mockCheckbox.mockResolvedValue([localProject]);

      const result = await pickPendingProjects(testRafDir);

      expect(result).toEqual([{
        folder: '1-solo',
        source: 'local',
        worktreeRoot: undefined,
      }]);
    });
  });
});
