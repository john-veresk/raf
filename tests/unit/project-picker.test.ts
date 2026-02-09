import { jest } from '@jest/globals';
import * as path from 'node:path';

// Mock @inquirer/prompts before importing the module
const mockSelect = jest.fn();
jest.unstable_mockModule('@inquirer/prompts', () => ({
  select: mockSelect,
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
const { pickPendingProject, getPendingProjects, formatProjectChoice, getPendingWorktreeProjects } = await import(
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
        { number: 1, name: 'completed-project', path: path.join(testRafDir, 'aaaaab-completed-project') },
        { number: 2, name: 'pending-project', path: path.join(testRafDir, 'aaaaac-pending-project') },
      ]);

      // First project is completed
      mockDeriveProjectState.mockImplementation((projectPath: string) => {
        if (projectPath.includes('aaaaab-completed')) {
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
        { number: 1, name: 'failed-project', path: path.join(testRafDir, 'aaaaab-failed-project') },
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
        { number: 1, name: 'ready-project', path: path.join(testRafDir, 'aaaaab-ready-project') },
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
        { number: 5, name: 'newer-project', path: path.join(testRafDir, 'aaaaaf-newer-project') },
        { number: 2, name: 'older-project', path: path.join(testRafDir, 'aaaaac-older-project') },
        { number: 10, name: 'newest-project', path: path.join(testRafDir, 'aaaaak-newest-project') },
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
        { number: 3, name: 'my-project', path: path.join(testRafDir, 'aaaaad-my-project') },
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

      expect(result[0]!.folder).toBe('aaaaad-my-project');
    });

    it('should set source to local for all projects', () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'my-project', path: path.join(testRafDir, 'aaaaab-my-project') },
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
        folder: 'aaaaab-fix-auth-bug',
        number: 1,
        name: 'fix-auth-bug',
        path: path.join(testRafDir, 'aaaaab-fix-auth-bug'),
        completedTasks: 2,
        totalTasks: 5,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('aaaaab fix-auth-bug (2/5 tasks)');
    });

    it('should format project with zero completed tasks', () => {
      const project = {
        folder: 'aaaaad-new-feature',
        number: 3,
        name: 'new-feature',
        path: path.join(testRafDir, 'aaaaad-new-feature'),
        completedTasks: 0,
        totalTasks: 3,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('aaaaad new-feature (0/3 tasks)');
    });

    it('should format project with single task', () => {
      const project = {
        folder: 'aaaaak-quick-fix',
        number: 10,
        name: 'quick-fix',
        path: path.join(testRafDir, 'aaaaak-quick-fix'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('aaaaak quick-fix (0/1 tasks)');
    });

    it('should append [worktree] suffix for worktree projects', () => {
      const project = {
        folder: 'aaaaab-my-feature',
        number: 1,
        name: 'my-feature',
        path: '/worktrees/myapp/aaaaab-my-feature/RAF/aaaaab-my-feature',
        completedTasks: 2,
        totalTasks: 5,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/aaaaab-my-feature',
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('aaaaab my-feature (2/5 tasks) [worktree]');
    });

    it('should not append [worktree] suffix for local projects', () => {
      const project = {
        folder: 'aaaaab-local-project',
        number: 1,
        name: 'local-project',
        path: path.join(testRafDir, 'aaaaab-local-project'),
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
      mockListWorktreeProjects.mockReturnValue(['aaaaab-my-feature']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/aaaaab-my-feature');
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
      expect(result[0]!.folder).toBe('aaaaab-my-feature');
      expect(result[0]!.name).toBe('my-feature');
      expect(result[0]!.source).toBe('worktree');
      expect(result[0]!.worktreeRoot).toBe('/worktrees/myapp/aaaaab-my-feature');
      expect(result[0]!.completedTasks).toBe(1);
      expect(result[0]!.totalTasks).toBe(2);
    });

    it('should skip completed worktree projects', () => {
      mockListWorktreeProjects.mockReturnValue(['aaaaab-done-project']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/aaaaab-done-project');
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
      mockListWorktreeProjects.mockReturnValue(['aaaaab-missing-project']);
      mockComputeWorktreePath.mockReturnValue('/worktrees/myapp/aaaaab-missing-project');
      mockExistsSync.mockReturnValue(false);

      const result = getPendingWorktreeProjects('myapp', 'RAF');

      expect(result).toEqual([]);
    });
  });

  describe('pickPendingProject', () => {
    it('should return null when no pending projects exist', async () => {
      mockDiscoverProjects.mockReturnValue([]);

      const result = await pickPendingProject(testRafDir);

      expect(result).toBeNull();
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should display pending projects as choices and return PickerResult', async () => {
      const firstProject = {
        folder: 'aaaaab-first-project',
        number: 1,
        name: 'first-project',
        path: path.join(testRafDir, 'aaaaab-first-project'),
        completedTasks: 1,
        totalTasks: 2,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'first-project', path: path.join(testRafDir, 'aaaaab-first-project') },
        { number: 2, name: 'second-project', path: path.join(testRafDir, 'aaaaac-second-project') },
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

      mockSelect.mockResolvedValue(firstProject);

      const result = await pickPendingProject(testRafDir);

      expect(result).toEqual({
        folder: 'aaaaab-first-project',
        source: 'local',
        worktreeRoot: undefined,
      });
    });

    it('should return selected project folder name in result', async () => {
      const selectedProject = {
        folder: 'aaaaaf-my-project',
        number: 5,
        name: 'my-project',
        path: path.join(testRafDir, 'aaaaaf-my-project'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 5, name: 'my-project', path: path.join(testRafDir, 'aaaaaf-my-project') },
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

      mockSelect.mockResolvedValue(selectedProject);

      const result = await pickPendingProject(testRafDir);

      expect(result).toEqual({
        folder: 'aaaaaf-my-project',
        source: 'local',
        worktreeRoot: undefined,
      });
    });

    it('should format choices with task progress', async () => {
      const testProject = {
        folder: 'aaaaab-test-project',
        number: 1,
        name: 'test-project',
        path: path.join(testRafDir, 'aaaaab-test-project'),
        completedTasks: 1,
        totalTasks: 3,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'test-project', path: path.join(testRafDir, 'aaaaab-test-project') },
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

      mockSelect.mockResolvedValue(testProject);

      await pickPendingProject(testRafDir);

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project to execute:',
        choices: [
          {
            name: 'aaaaab test-project (1/3 tasks)',
            value: testProject,
          },
        ],
      });
    });

    it('should handle single pending project', async () => {
      const onlyProject = {
        folder: 'aaaaah-only-project',
        number: 7,
        name: 'only-project',
        path: path.join(testRafDir, 'aaaaah-only-project'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 7, name: 'only-project', path: path.join(testRafDir, 'aaaaah-only-project') },
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

      mockSelect.mockResolvedValue(onlyProject);

      const result = await pickPendingProject(testRafDir);

      expect(result).toEqual({
        folder: 'aaaaah-only-project',
        source: 'local',
        worktreeRoot: undefined,
      });
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should merge worktree projects into picker choices', async () => {
      const localProject = {
        folder: 'aaaaab-local-proj',
        number: 1,
        name: 'local-proj',
        path: path.join(testRafDir, 'aaaaab-local-proj'),
        completedTasks: 0,
        totalTasks: 2,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'local-proj', path: path.join(testRafDir, 'aaaaab-local-proj') },
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
        folder: 'aaaaac-wt-proj',
        number: 2,
        name: 'wt-proj',
        path: '/worktrees/myapp/aaaaac-wt-proj/RAF/aaaaac-wt-proj',
        completedTasks: 1,
        totalTasks: 3,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/aaaaac-wt-proj',
      };

      mockSelect.mockResolvedValue(worktreeProject);

      const result = await pickPendingProject(testRafDir, [worktreeProject]);

      // Should have been called with both local and worktree projects
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project to execute:',
        choices: expect.arrayContaining([
          expect.objectContaining({ name: expect.stringContaining('local-proj') }),
          expect.objectContaining({ name: expect.stringContaining('[worktree]') }),
        ]),
      });

      expect(result).toEqual({
        folder: 'aaaaac-wt-proj',
        source: 'worktree',
        worktreeRoot: '/worktrees/myapp/aaaaac-wt-proj',
      });
    });

    it('should deduplicate projects when same folder exists in local and worktree (prefer worktree)', async () => {
      const worktreeVersion = {
        folder: 'aaaaab-shared-proj',
        number: 1,
        name: 'shared-proj',
        path: '/worktrees/myapp/aaaaab-shared-proj/RAF/aaaaab-shared-proj',
        completedTasks: 2,
        totalTasks: 3,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/aaaaab-shared-proj',
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'shared-proj', path: path.join(testRafDir, 'aaaaab-shared-proj') },
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

      mockSelect.mockResolvedValue(worktreeVersion);

      await pickPendingProject(testRafDir, [worktreeVersion]);

      // Should have only 1 choice (deduplicated), and it should be the worktree version
      const selectCall = mockSelect.mock.calls[0] as [{ choices: Array<{ name: string; value: { source: string } }> }];
      expect(selectCall[0].choices).toHaveLength(1);
      expect(selectCall[0].choices[0]!.value.source).toBe('worktree');
    });

    it('should sort mixed local and worktree projects chronologically', async () => {
      mockDiscoverProjects.mockReturnValue([
        { number: 5, name: 'later-local', path: path.join(testRafDir, 'aaaaaf-later-local') },
        { number: 1, name: 'early-local', path: path.join(testRafDir, 'aaaaab-early-local') },
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
        folder: 'aaaaad-mid-worktree',
        number: 3,
        name: 'mid-worktree',
        path: '/worktrees/myapp/aaaaad-mid-worktree/RAF/aaaaad-mid-worktree',
        completedTasks: 0,
        totalTasks: 2,
        source: 'worktree' as const,
        worktreeRoot: '/worktrees/myapp/aaaaad-mid-worktree',
      };

      const earlyLocal = {
        folder: 'aaaaab-early-local',
        number: 1,
        name: 'early-local',
        path: path.join(testRafDir, 'aaaaab-early-local'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockSelect.mockResolvedValue(earlyLocal);

      await pickPendingProject(testRafDir, [worktreeProject]);

      const selectCall = mockSelect.mock.calls[0] as [{ choices: Array<{ name: string; value: { number: number } }> }];
      const numbers = selectCall[0].choices.map((c) => c.value.number);
      expect(numbers).toEqual([1, 3, 5]);
    });

    it('should work with no worktree projects (backwards compatible)', async () => {
      const localProject = {
        folder: 'aaaaab-solo',
        number: 1,
        name: 'solo',
        path: path.join(testRafDir, 'aaaaab-solo'),
        completedTasks: 0,
        totalTasks: 1,
        source: 'local' as const,
      };

      mockDiscoverProjects.mockReturnValue([
        { number: 1, name: 'solo', path: path.join(testRafDir, 'aaaaab-solo') },
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

      mockSelect.mockResolvedValue(localProject);

      const result = await pickPendingProject(testRafDir);

      expect(result).toEqual({
        folder: 'aaaaab-solo',
        source: 'local',
        worktreeRoot: undefined,
      });
    });
  });
});
