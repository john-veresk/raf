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

// Import after mocking
const { pickPendingProject, getPendingProjects, formatProjectChoice } = await import(
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
      };

      const result = formatProjectChoice(project);

      expect(result).toBe('aaaaak quick-fix (0/1 tasks)');
    });
  });

  describe('pickPendingProject', () => {
    it('should return null when no pending projects exist', async () => {
      mockDiscoverProjects.mockReturnValue([]);

      const result = await pickPendingProject(testRafDir);

      expect(result).toBeNull();
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('should display pending projects as choices', async () => {
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

      mockSelect.mockResolvedValue('aaaaab-first-project');

      const result = await pickPendingProject(testRafDir);

      expect(result).toBe('aaaaab-first-project');
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project to execute:',
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'aaaaab-first-project' }),
          expect.objectContaining({ value: 'aaaaac-second-project' }),
        ]),
      });
    });

    it('should return selected project folder name', async () => {
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

      mockSelect.mockResolvedValue('aaaaaf-my-project');

      const result = await pickPendingProject(testRafDir);

      expect(result).toBe('aaaaaf-my-project');
    });

    it('should format choices with task progress', async () => {
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

      mockSelect.mockResolvedValue('aaaaab-test-project');

      await pickPendingProject(testRafDir);

      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project to execute:',
        choices: [
          {
            name: 'aaaaab test-project (1/3 tasks)',
            value: 'aaaaab-test-project',
          },
        ],
      });
    });

    it('should handle single pending project', async () => {
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

      mockSelect.mockResolvedValue('aaaaah-only-project');

      const result = await pickPendingProject(testRafDir);

      expect(result).toBe('aaaaah-only-project');
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });
  });
});
