import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';
import { jest } from '@jest/globals';
import { resolveProjectIdentifier, extractProjectName } from '../../src/utils/paths.js';
import {
  deriveProjectState,
  getDerivedStats,
  discoverProjects,
  type DerivedProjectState,
} from '../../src/core/state-derivation.js';

let mockStatusProjectLimit = 10;
let mockHomeDir: string | null = null;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  newline: jest.fn(),
  dim: jest.fn(),
};

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

jest.unstable_mockModule('node:os', () => ({
  ...os,
  homedir: () => mockHomeDir ?? os.homedir(),
}));

jest.unstable_mockModule('../../src/utils/config.js', () => ({
  getStatusProjectLimit: jest.fn(() => mockStatusProjectLimit),
  getModel: jest.fn(() => ({ model: 'opus', harness: 'claude' })),
  getCommitFormat: jest.fn(() => '{prefix}[{projectName}] Merge: {branchName} into {targetBranch}'),
  getCommitPrefix: jest.fn(() => 'RAF'),
  renderCommitMessage: jest.fn((_template: string, vars: Record<string, string>) => `RAF[${vars['projectName']}] Merge: ${vars['branchName']} into ${vars['targetBranch']}`),
  getTimeout: jest.fn(() => 60),
}));

const { createStatusCommand } = await import('../../src/commands/status.js');

describe('Status Command - Command Behavior', () => {
  let tempDir: string;
  let tempHome: string;
  let originalCwd: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-status-command-'));
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-status-home-'));
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    process.chdir(tempDir);
    process.env.HOME = tempHome;
    mockHomeDir = tempHome;
    fs.mkdirSync(path.join(tempDir, 'RAF'));
    execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: tempDir });

    mockStatusProjectLimit = 10;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    mockHomeDir = null;
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  function createProject(
    number: number,
    name: string,
    baseDir = path.join(tempDir, 'RAF')
  ): string {
    const projectPath = path.join(baseDir, `${number}-${name}`);
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), '# Test Input\n');
    fs.writeFileSync(
      path.join(projectPath, 'plans', '01-task.md'),
      '# Task: task\n\n## Objective\nTest task\n'
    );
    return projectPath;
  }

  function createWorktreeProject(folder: string): string {
    const worktreeBaseDir = path.join(tempHome, '.raf', 'worktrees', path.basename(tempDir), folder, 'RAF');
    return createProject(parseInt(folder, 10), folder.replace(/^\d+-/, ''), worktreeBaseDir);
  }

  async function runStatus(args: string[] = []): Promise<void> {
    const command = createStatusCommand();
    command.exitOverride();
    await command.parseAsync(['node', 'status', ...args]);
  }

  function infoMessages(): string[] {
    return mockLogger.info.mock.calls.map(([message]) => String(message));
  }

  function mainProjectLines(): string[] {
    return infoMessages().filter((message) => /^\d+ /.test(message));
  }

  function worktreeProjectLines(): string[] {
    return infoMessages().filter((message) => /^  \d+ /.test(message));
  }

  it('defaults to showing the last 10 main projects in plain text output', async () => {
    for (let i = 1; i <= 12; i++) {
      createProject(i, `project-${i}`);
    }

    await runStatus();

    const mainLines = mainProjectLines();
    expect(mainLines).toHaveLength(10);
    expect(mainLines[0]).toContain('project-3');
    expect(mainLines[9]).toContain('project-12');
    expect(mockLogger.dim).toHaveBeenCalledWith('... and 2 more projects');
  });

  it('applies a custom display.statusProjectLimit only to the human-readable main project list', async () => {
    mockStatusProjectLimit = 3;
    for (let i = 1; i <= 5; i++) {
      createProject(i, `project-${i}`);
    }

    await runStatus();

    const mainLines = mainProjectLines();
    expect(mainLines).toHaveLength(3);
    expect(mainLines[0]).toContain('project-3');
    expect(mainLines[2]).toContain('project-5');
    expect(mockLogger.dim).toHaveBeenCalledWith('... and 2 more projects');
  });

  it('treats display.statusProjectLimit = 0 as unlimited for plain text output', async () => {
    mockStatusProjectLimit = 0;
    for (let i = 1; i <= 12; i++) {
      createProject(i, `project-${i}`);
    }

    await runStatus();

    expect(mainProjectLines()).toHaveLength(12);
    expect(mockLogger.dim).not.toHaveBeenCalled();
  });

  it('lets --all override the configured plain-text main project limit', async () => {
    mockStatusProjectLimit = 2;
    for (let i = 1; i <= 5; i++) {
      createProject(i, `project-${i}`);
    }

    await runStatus(['--all']);

    expect(mainProjectLines()).toHaveLength(5);
    expect(mockLogger.dim).not.toHaveBeenCalled();
  });

  it('keeps --json unbounded for both main projects and worktrees', async () => {
    mockStatusProjectLimit = 2;
    const worktreeFolders = ['101-wt-1', '102-wt-2', '103-wt-3'];

    for (let i = 1; i <= 5; i++) {
      createProject(i, `project-${i}`);
    }
    for (const folder of worktreeFolders) {
      createWorktreeProject(folder);
    }

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await runStatus(['--json']);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const printed = JSON.parse(String(consoleSpy.mock.calls[0]?.[0] ?? '{}'));
    expect(printed.projects).toHaveLength(5);
    expect(printed.worktrees).toHaveLength(3);

    consoleSpy.mockRestore();
  });

  it('does not truncate the Worktrees section when the main list is limited', async () => {
    mockStatusProjectLimit = 2;
    const worktreeFolders = ['101-wt-1', '102-wt-2', '103-wt-3'];

    for (let i = 1; i <= 5; i++) {
      createProject(i, `project-${i}`);
    }
    for (const folder of worktreeFolders) {
      createWorktreeProject(folder);
    }

    await runStatus();

    expect(mainProjectLines()).toHaveLength(2);
    expect(infoMessages()).toContain('Worktrees:');
    expect(worktreeProjectLines()).toHaveLength(3);
  });
});

describe('Status Command - Identifier Support', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-status-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Identifier Resolution for Status', () => {
    it('should resolve project by numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '3-fix-bug'));
      const result = resolveProjectIdentifier(tempDir, '3');
      expect(result).toBe(path.join(tempDir, '3-fix-bug'));
    });

    it('should resolve project by name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'my-project');
      expect(result).toBe(path.join(tempDir, '1-my-project'));
    });

    it('should resolve project by full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '1-fix-stuff'));
      const result = resolveProjectIdentifier(tempDir, '1-fix-stuff');
      expect(result).toBe(path.join(tempDir, '1-fix-stuff'));
    });

    it('should return null for invalid identifier', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      const result = resolveProjectIdentifier(tempDir, 'non-existent');
      expect(result).toBeNull();
    });

    it('should handle case-insensitive folder matching for full folder names', () => {
      fs.mkdirSync(path.join(tempDir, '1-My-Project'));
      const result = resolveProjectIdentifier(tempDir, '1-my-project');
      expect(result).toBe(path.join(tempDir, '1-My-Project'));
    });
  });

  describe('Project Name Extraction', () => {
    it('should extract project name from numeric prefix folder', () => {
      const projectPath = path.join(tempDir, '1-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should extract project name from multi-digit prefix', () => {
      const projectPath = path.join(tempDir, '12-my-project');
      const name = extractProjectName(projectPath);
      expect(name).toBe('my-project');
    });

    it('should return null for non-project folder', () => {
      const projectPath = path.join(tempDir, 'not-a-project');
      const name = extractProjectName(projectPath);
      expect(name).toBeNull();
    });
  });

  describe('All Identifier Formats Work', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tempDir, '3-first-project'));
      fs.mkdirSync(path.join(tempDir, '7-second-project'));
    });

    it('should work with numeric prefix', () => {
      expect(resolveProjectIdentifier(tempDir, '3')).toBe(path.join(tempDir, '3-first-project'));
    });

    it('should work with numeric prefix for second project', () => {
      expect(resolveProjectIdentifier(tempDir, '7')).toBe(path.join(tempDir, '7-second-project'));
    });

    it('should work with project name for first project', () => {
      expect(resolveProjectIdentifier(tempDir, 'first-project')).toBe(path.join(tempDir, '3-first-project'));
    });

    it('should work with project name for second project', () => {
      expect(resolveProjectIdentifier(tempDir, 'second-project')).toBe(path.join(tempDir, '7-second-project'));
    });

    it('should work with full folder name (first project)', () => {
      expect(resolveProjectIdentifier(tempDir, '3-first-project')).toBe(path.join(tempDir, '3-first-project'));
    });

    it('should work with full folder name (second project)', () => {
      expect(resolveProjectIdentifier(tempDir, '7-second-project')).toBe(path.join(tempDir, '7-second-project'));
    });
  });

  describe('Error Cases', () => {
    it('should return null for non-existent numeric ID', () => {
      fs.mkdirSync(path.join(tempDir, '1-project'));
      expect(resolveProjectIdentifier(tempDir, '99')).toBeNull();
    });

    it('should return null for non-existent project name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      expect(resolveProjectIdentifier(tempDir, 'other-project')).toBeNull();
    });

    it('should return null for non-existent full folder name', () => {
      fs.mkdirSync(path.join(tempDir, '1-my-project'));
      expect(resolveProjectIdentifier(tempDir, '2-my-project')).toBeNull();
    });

    it('should return null for empty RAF directory', () => {
      expect(resolveProjectIdentifier(tempDir, '1')).toBeNull();
    });

    it('should return null for non-existent RAF directory', () => {
      expect(resolveProjectIdentifier('/non/existent/path', '1')).toBeNull();
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
    fs.mkdirSync(path.join(tempDir, `${number}-${name}`));
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
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainDir, '1-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);
      createProjectWithTasks(wtDir, '1-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '1-test'));
      const wtState = deriveProjectState(path.join(wtDir, '1-test'));

      expect(mainState.tasks.length).toBe(wtState.tasks.length);
      expect(mainState.tasks.length).toBe(2);
      for (let i = 0; i < mainState.tasks.length; i++) {
        expect(mainState.tasks[i].status).toBe(wtState.tasks[i].status);
      }
    });

    it('should detect differing task counts (amendment scenario)', () => {
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainDir, '1-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
      ]);
      createProjectWithTasks(wtDir, '1-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b', status: 'completed' },
        { id: '03', name: 'task-c' },
        { id: '04', name: 'task-d' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '1-test'));
      const wtState = deriveProjectState(path.join(wtDir, '1-test'));

      expect(mainState.tasks.length).toBe(2);
      expect(wtState.tasks.length).toBe(4);
    });

    it('should detect differing task statuses', () => {
      const mainDir = path.join(tempDir, 'main');
      const wtDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainDir, '1-test', [
        { id: '01', name: 'task-a' },
        { id: '02', name: 'task-b' },
      ]);
      createProjectWithTasks(wtDir, '1-test', [
        { id: '01', name: 'task-a', status: 'completed' },
        { id: '02', name: 'task-b' },
      ]);

      const mainState = deriveProjectState(path.join(mainDir, '1-test'));
      const wtState = deriveProjectState(path.join(wtDir, '1-test'));

      expect(mainState.tasks[0].status).toBe('pending');
      expect(wtState.tasks[0].status).toBe('completed');
    });
  });

  describe('Worktree Project Discovery', () => {
    it('should discover worktree projects via listWorktreeProjects pattern', () => {
      const worktreeBaseDir = path.join(tempDir, 'worktree-base');
      fs.mkdirSync(path.join(worktreeBaseDir, '1-feature-a'), { recursive: true });
      fs.mkdirSync(path.join(worktreeBaseDir, '2-feature-b'), { recursive: true });

      const entries = fs.readdirSync(worktreeBaseDir, { withFileTypes: true });
      const projects = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();

      expect(projects).toEqual(['1-feature-a', '2-feature-b']);
    });

    it('should derive state from worktree project path', () => {
      const wtPath = path.join(tempDir, 'wt-root');
      const rafRelativePath = 'RAF';
      const projectFolder = '1-feature';
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
      const mainRafDir = path.join(tempDir, 'main-raf');
      createProjectWithTasks(mainRafDir, '1-auth', [
        { id: '01', name: 'login', status: 'completed' },
      ]);

      const mainFolderNames = new Set(
        discoverProjects(mainRafDir).map(p => path.basename(p.path))
      );

      const worktreeFolders = ['1-auth', '2-new-feature'];

      const worktreeOnly = worktreeFolders.filter(f => !mainFolderNames.has(f));
      expect(worktreeOnly).toEqual(['2-new-feature']);

      const withCounterpart = worktreeFolders.filter(f => mainFolderNames.has(f));
      expect(withCounterpart).toEqual(['1-auth']);
    });

    it('should identify differing worktree projects for display', () => {
      const mainRafDir = path.join(tempDir, 'main');
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainRafDir, '1-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);

      createProjectWithTasks(wtRafDir, '1-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
        { id: '03', name: 'oauth' },
        { id: '04', name: 'sso' },
      ]);

      const mainState = deriveProjectState(path.join(mainRafDir, '1-auth'));
      const wtState = deriveProjectState(path.join(wtRafDir, '1-auth'));

      expect(mainState.tasks.length).not.toBe(wtState.tasks.length);
      expect(mainState.status).toBe('completed');
      expect(wtState.status).toBe('executing');
    });

    it('should not show worktree project when identical to main', () => {
      const mainRafDir = path.join(tempDir, 'main');
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(mainRafDir, '1-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);
      createProjectWithTasks(wtRafDir, '1-auth', [
        { id: '01', name: 'login', status: 'completed' },
        { id: '02', name: 'signup', status: 'completed' },
      ]);

      const mainState = deriveProjectState(path.join(mainRafDir, '1-auth'));
      const wtState = deriveProjectState(path.join(wtRafDir, '1-auth'));

      expect(mainState.tasks.length).toBe(wtState.tasks.length);
      for (let i = 0; i < mainState.tasks.length; i++) {
        expect(mainState.tasks[i].status).toBe(wtState.tasks[i].status);
      }

      const differs = mainState.tasks.length !== wtState.tasks.length ||
        mainState.tasks.some((t, i) => t.status !== wtState.tasks[i].status);
      expect(differs).toBe(false);
    });
  });

  describe('Worktree Stats Display', () => {
    it('should compute correct stats for worktree project with mixed states', () => {
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(wtRafDir, '1-feature', [
        { id: '01', name: 'setup', status: 'completed' },
        { id: '02', name: 'implement', status: 'completed' },
        { id: '03', name: 'test', status: 'failed' },
        { id: '04', name: 'deploy' },
      ]);

      const state = deriveProjectState(path.join(wtRafDir, '1-feature'));
      const stats = getDerivedStats(state);

      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.total).toBe(4);
    });

    it('should show worktree-only project stats correctly', () => {
      const wtRafDir = path.join(tempDir, 'worktree');

      createProjectWithTasks(wtRafDir, '1-new-only', [
        { id: '01', name: 'step-a' },
        { id: '02', name: 'step-b' },
        { id: '03', name: 'step-c' },
      ]);

      const state = deriveProjectState(path.join(wtRafDir, '1-new-only'));
      const stats = getDerivedStats(state);

      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(3);
      expect(stats.total).toBe(3);
      expect(state.status).toBe('ready');
    });
  });
});
