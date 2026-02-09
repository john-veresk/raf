import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveProjectIdentifier, extractProjectName, encodeBase36 } from '../../src/utils/paths.js';
import {
  deriveProjectState,
  getDerivedStats,
  discoverProjects,
  type DerivedProjectState,
} from '../../src/core/state-derivation.js';

describe('Status Command - Identifier Support', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Identifier Resolution for Status', () => {
    it('should resolve project by 6-char base36 ID', () => {
      fs.mkdirSync(path.join(tempDir, '000003-fix-bug'));
      const result = resolveProjectIdentifier(tempDir, '000003');
      expect(result).toBe(path.join(tempDir, '000003-fix-bug'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '000001-my-project'));
    });

    it('should resolve project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '000001-fix-stuff');
      expect(result).toBe(path.join(tempDir, '000001-fix-stuff'));
    });

    it('should resolve project by full base36 folder name', () => {
      fs.mkdirSync(path.join(tempDir, '00a001-important'));
      const result = resolveProjectIdentifier(tempDir, '00a001-important');
      expect(result).toBe(path.join(tempDir, '00a001-important'));
    });

    it('should return null for invalid identifier', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching for full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '00A001-My-Project'));
      const result = resolveProjectIdentifier(tempDir, '00a001-my-project');
      expect(result).toBe(path.join(tempDir, '00A001-My-Project'));
    });
  });

  describe('Project Name Extraction', () => {
    it('should extract project name from 6-char prefix folder', () => {
      const projectPath = path.join(tempDir, '000001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract project name from base36 folder', () => {
      const projectPath = path.join(tempDir, '00a001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should return null for old-format folder', () => {
      const projectPath = path.join(tempDir, '001-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBeNull();
    });
  });

  describe('All Identifier Formats Work', () => {
    beforeEach(() => {
      // Create projects with 6-char prefixes
      fs.mkdirSync(path.join(tempDir, '000003-numeric-project'));
      fs.mkdirSync(path.join(tempDir, '00a001-base36-project'));
    });

    it('should work with 6-char base36 prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '000003')).toBe(path.join(tempDir, '000003-numeric-project'));
    });

    it('should work with 6-char base36 prefix for non-numeric project', () => {
      expect(resolveProjectIdentifier(tempDir, '00a001')).toBe(path.join(tempDir, '00a001-base36-project'));
    });

    it('should work with project name for numeric-prefix project', () => {
      expect(resolveProjectIdentifier(tempDir, 'numeric-project')).toBe(path.join(tempDir, '000003-numeric-project'));
    });

    it('should work with project name for base36-prefix project', () => {
      expect(resolveProjectIdentifier(tempDir, 'base36-project')).toBe(path.join(tempDir, '00a001-base36-project'));
    });

    it('should work with full folder name (numeric-prefix)', () => {
      expect(resolveProjectIdentifier(tempDir, '000003-numeric-project')).toBe(path.join(tempDir, '000003-numeric-project'));
    });

    it('should work with full folder name (base36-prefix)', () => {
      expect(resolveProjectIdentifier(tempDir, '00a001-base36-project')).toBe(path.join(tempDir, '00a001-base36-project'));
    });
  });

  describe('Error Cases', () => {
    it('should return null for non-existent 6-char base36 ID', () => {
      fs.mkdirSync(path.join(tempDir, '000001-project'));
      expect(resolveProjectIdentifier(tempDir, '0000rs')).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'other-project')).toBeNull();
    });

    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '000001-my-project'));
      expect(resolveProjectIdentifier(tempDir, '000002-my-project')).toBeNull();
    });

    it('should return null for empty RAF directory', () => {
      expect(resolveProjectIdentifier(tempDir, '000001')).toBeNull();
    });

    it('should return null for non-existent RAF directory', () => {
      expect(resolveProjectIdentifier('/non/existent/path', '000001')).toBeNull();
    });
  });
});

describe('Status Command - Truncation Behavior', () => {
  let tempDir: string;
  const MAX_DISPLAYED_PROJECTS = 10;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-truncation-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createProject(number: number, name: string): void {
    const projectPrefix = encodeBase36(number);
    fs.mkdirSync(path.join(tempDir, `${projectPrefix}-${name}`));
  }

  describe('Project List Truncation Logic', () => {
    it('should return all projects when count is less than max', () => {
      createProject(1, 'project-a');
      createProject(2, 'project-b');
      createProject(3, 'project-c');

      const projects = discoverProjects(tempDir);
      expect(projects.length).toBe(3);
      expect(projects.length).toBeLessThanOrEqual(MAX_DISPLAYED_PROJECTS);
    });

    it('should return all projects when count equals max', () => {
      for (let i = 1; i <= MAX_DISPLAYED_PROJECTS; i++) {
        createProject(i, `project-${i}`);
      }

      const projects = discoverProjects(tempDir);
      expect(projects.length).toBe(MAX_DISPLAYED_PROJECTS);
    });

    it('should have more than max projects for truncation testing', () => {
      for (let i = 1; i <= 15; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      expect(allProjects.length).toBe(15);
      expect(allProjects.length).toBeGreaterThan(MAX_DISPLAYED_PROJECTS);

      // Verify truncation would yield correct hidden count
      const hiddenCount = allProjects.length - MAX_DISPLAYED_PROJECTS;
      expect(hiddenCount).toBe(5);
    });

    it('should slice to get last N projects (sorted by number ascending)', () => {
      for (let i = 1; i <= 15; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      const displayedProjects = allProjects.slice(-MAX_DISPLAYED_PROJECTS);

      // Should have projects 6-15 (last 10)
      expect(displayedProjects.length).toBe(MAX_DISPLAYED_PROJECTS);
      expect(displayedProjects[0].number).toBe(6);
      expect(displayedProjects[9].number).toBe(15);
    });

    it('should keep projects in ascending order after slicing', () => {
      for (let i = 1; i <= 12; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      const displayedProjects = allProjects.slice(-MAX_DISPLAYED_PROJECTS);

      // Verify ascending order
      for (let i = 1; i < displayedProjects.length; i++) {
        expect(displayedProjects[i].number).toBeGreaterThan(displayedProjects[i - 1].number);
      }
    });

    it('should calculate correct hidden count', () => {
      // Test with 25 projects
      for (let i = 1; i <= 25; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      const hiddenCount = Math.max(0, allProjects.length - MAX_DISPLAYED_PROJECTS);

      expect(hiddenCount).toBe(15);
    });

    it('should have zero hidden count when projects are at or below max', () => {
      for (let i = 1; i <= 5; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      const hiddenCount = Math.max(0, allProjects.length - MAX_DISPLAYED_PROJECTS);

      expect(hiddenCount).toBe(0);
    });

    it('should handle exactly max + 1 projects', () => {
      for (let i = 1; i <= MAX_DISPLAYED_PROJECTS + 1; i++) {
        createProject(i, `project-${i}`);
      }

      const allProjects = discoverProjects(tempDir);
      const hiddenCount = Math.max(0, allProjects.length - MAX_DISPLAYED_PROJECTS);
      const displayedProjects = allProjects.slice(-MAX_DISPLAYED_PROJECTS);

      expect(hiddenCount).toBe(1);
      expect(displayedProjects.length).toBe(MAX_DISPLAYED_PROJECTS);
      expect(displayedProjects[0].number).toBe(2);
    });
  });
});

describe('Status Command - Worktree Discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-wt-status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a project with plans and optional outcomes.
   */
  function createProjectWithTasks(
    baseDir: string,
    projectFolder: string,
    tasks: Array<{ id: string; name: string; status?: 'completed' | 'failed' | 'pending' }>
  ): string {
    const projectPath = path.join(baseDir, projectFolder);
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Test Input\n');

    for (const task of tasks) {
      // Write plan file
      fs.writeFileSync(
        path.join(projectPath, 'plans', `${task.id}-${task.name}.md`),
        `# Task: ${task.name}\n\n## Objective\nTest task\n`
      );

      // Write outcome file if not pending
      if (task.status === 'completed') {
        fs.writeFileSync(
          path.join(projectPath, 'outcomes', `${task.id}-${task.name}.md`),
          `# Outcome\nCompleted.\n\n<promise>COMPLETE</promise>\n`
        );
      } else if (task.status === 'failed') {
        fs.writeFileSync(
          path.join(projectPath, 'outcomes', `${task.id}-${task.name}.md`),
          `# Outcome\nFailed.\n\n<promise>FAILED</promise>\n`
        );
      }
    }

    return projectPath;
  }

  describe('Project State Comparison', () => {
    it('should detect identical project states', () => {
      // Create two identical project directories
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainDir, '000001-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);
      createProjectWithTasks(wtDir, '000001-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '000001-test'));
      const wtState = deriveProjectState(path.join(wtDir, '000001-test'));

      // Same task count and same statuses
      expect(mainState.tasks.length).toBe(wtState.tasks.length);
      expect(mainState.tasks.length).toBe(2);
      for (let i = 0; i < mainState.tasks.length; i++) {
        expect(mainState.tasks[i].status).toBe(wtState.tasks[i].status);
      }
    });

    it('should detect differing task counts (amendment scenario)', () => {
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      // Main: 2 tasks completed
      createProjectWithTasks(mainDir, '000001-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);
      // Worktree: 4 tasks (2 completed + 2 pending from amend)
      createProjectWithTasks(wtDir, '000001-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
        { id: '03', name: 'task-c' },
        { id: '04', name: 'task-d' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '000001-test'));
      const wtState = deriveProjectState(path.join(wtDir, '000001-test'));

      expect(mainState.tasks.length).toBe(2);
      expect(wtState.tasks.length).toBe(4);
    });

    it('should detect differing task statuses', () => {
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      // Main: all pending
      createProjectWithTasks(mainDir, '000001-test', [
        { id: '01', name: 'task-a' },
        { id: '02', name: 'task-b' },
      ]);
      // Worktree: some completed
      createProjectWithTasks(wtDir, '000001-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '000001-test'));
      const wtState = deriveProjectState(path.join(wtDir, '000001-test'));

      expect(mainState.tasks[0].status).toBe('pending');
      expect(wtState.tasks[0].status).toBe('completed');
    });
  });

  describe('Worktree Project Discovery', () => {
    it('should discover worktree projects via listWorktreeProjects pattern', () => {
      // Simulate the worktree base dir structure
      const worktreeBaseDir = path.join(tempDir, 'worktree-base');
      fs.mkdirSync(path.join(worktreeBaseDir, '000020-feature-a'), { recursive: true });
      fs.mkdirSync(path.join(worktreeBaseDir, '000021-feature-b'), { recursive: true });

      // Read directory to simulate what listWorktreeProjects does
      const entries = fs.readdirSync(worktreeBaseDir, { withFileTypes: true });
      const projects = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();

      expect(projects).toEqual(['000020-feature-a', '000021-feature-b']);
    });

    it('should derive state from worktree project path', () => {
      // Simulate worktree project path: <wtPath>/<rafRelativePath>/<projectFolder>
      const wtPath = path.join(tempDir, 'wt-root');
      const rafRelativePath = 'RAF';
      const projectFolder = '000020-feature';
      const wtProjectPath = path.join(wtPath, rafRelativePath, projectFolder);

      createProjectWithTasks(path.join(wtPath, rafRelativePath), projectFolder, [
        { id: '01', name: 'setup', status: 'completed' },
        { id: '02', name: 'implement' },
        { id: '03', name: 'test' },
      ]);

      const state = deriveProjectState(wtProjectPath);
      const stats = getDerivedStats(state);

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it('should filter out worktree-only projects correctly', () => {
      // Create main repo projects
      const mainRafDir = path.join(tempDir, 'main-raf');
      createProjectWithTasks(mainRafDir, '000001-auth', [
        { id: '01', name: 'login', status: 'completed' },
      ]);

      // Main repo folders
      const mainFolderNames = new Set(
        discoverProjects(mainRafDir).map(p => path.basename(p.path))
      );

      // Worktree folders include one that doesn't exist in main
      const worktreeFolders = ['000001-auth', '000020-new-feature'];

      // Worktree-only projects
      const worktreeOnly = worktreeFolders.filter(f => !mainFolderNames.has(f));
      expect(worktreeOnly).toEqual(['000020-new-feature']);

      // Projects with main counterpart
      const withCounterpart = worktreeFolders.filter(f => mainFolderNames.has(f));
      expect(withCounterpart).toEqual(['000001-auth']);
    });

    it('should identify differing worktree projects for display', () => {
      const mainRafDir = path.join(tempDir, 'main');
      const wtRafDir = path.join(tempDir, 'worktree');

      // Main: 2 tasks all completed
      createProjectWithTasks(mainRafDir, '000001-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);

      // Worktree: same 2 tasks completed + 2 new pending (amendment)
      createProjectWithTasks(wtRafDir, '000001-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
        { id: '03', name: 'oauth' },
        { id: '04', name: 'sso' },
      ]);

      const mainState = deriveProjectState(path.join(mainRafDir, '000001-auth'));
      const wtState = deriveProjectState(path.join(wtRafDir, '000001-auth'));

      // Different task counts = states differ
      expect(mainState.tasks.length).not.toBe(wtState.tasks.length);

      // Main is completed, worktree is executing
      expect(mainState.status).toBe('completed');
      expect(wtState.status).toBe('executing');
    });

    it('should not show worktree project when identical to main', () => {
      const mainRafDir = path.join(tempDir, 'main');
      const wtRafDir = path.join(tempDir, 'worktree');

      // Both have identical state
      createProjectWithTasks(mainRafDir, '000001-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);
      createProjectWithTasks(wtRafDir, '000001-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);

      const mainState = deriveProjectState(path.join(mainRafDir, '000001-auth'));
      const wtState = deriveProjectState(path.join(wtRafDir, '000001-auth'));

      // Same task count
      expect(mainState.tasks.length).toBe(wtState.tasks.length);

      // Same statuses
      for (let i = 0; i < mainState.tasks.length; i++) {
        expect(mainState.tasks[i].status).toBe(wtState.tasks[i].status);
      }

      // The comparison function logic: these are identical so should NOT be shown
      const differs = mainState.tasks.length !== wtState.tasks.length ||
        mainState.tasks.some((t, i) => t.status !== wtState.tasks[i].status);
      expect(differs).toBe(false);
    });
  });

  describe('Worktree Stats Display', () => {
    it('should compute correct stats for worktree project with mixed states', () => {
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(wtRafDir, '000020-feature', [
        { id: '01', name: 'setup', status: 'completed' },
        { id: '02', name: 'implement', status: 'completed' },
        { id: '03', name: 'test', status: 'failed' },
        { id: '04', name: 'deploy' },
      ]);

      const state = deriveProjectState(path.join(wtRafDir, '000020-feature'));
      const stats = getDerivedStats(state);

      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.total).toBe(4);
    });

    it('should show worktree-only project stats correctly', () => {
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(wtRafDir, '000025-new-only', [
        { id: '01', name: 'step-a' },
        { id: '02', name: 'step-b' },
        { id: '03', name: 'step-c' },
      ]);

      const state = deriveProjectState(path.join(wtRafDir, '000025-new-only'));
      const stats = getDerivedStats(state);

      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(3);
      expect(stats.total).toBe(3);
      expect(state.status).toBe('ready');
    });
  });
});
