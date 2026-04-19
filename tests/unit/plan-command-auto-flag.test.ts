import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { jest } from '@jest/globals';

const mockRunInteractive = jest.fn<() => Promise<number>>();
const mockCreateRunner = jest.fn(() => ({
  runInteractive: mockRunInteractive,
}));
const mockCommitPlanningArtifacts = jest.fn<() => Promise<void>>();
const mockOpenEditor = jest.fn<() => Promise<string>>();
const mockGenerateProjectNames = jest.fn<() => Promise<string[]>>();
const mockPickProjectName = jest.fn<() => Promise<string>>();
const mockSelect = jest.fn<() => Promise<string>>();
const mockDeriveProjectState = jest.fn();
const mockIsProjectComplete = jest.fn(() => false);
const mockLogger = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  newline: jest.fn(),
  debug: jest.fn(),
};
const mockShutdownHandler = {
  init: jest.fn(),
  registerClaudeRunner: jest.fn(),
  onShutdown: jest.fn(),
};

jest.unstable_mockModule('@inquirer/prompts', () => ({
  select: mockSelect,
}));

jest.unstable_mockModule('../../src/core/runner-factory.js', () => ({
  createRunner: mockCreateRunner,
}));

jest.unstable_mockModule('../../src/core/shutdown-handler.js', () => ({
  shutdownHandler: mockShutdownHandler,
}));

jest.unstable_mockModule('../../src/core/git.js', () => ({
  commitPlanningArtifacts: mockCommitPlanningArtifacts,
}));

jest.unstable_mockModule('../../src/core/state-derivation.js', () => ({
  deriveProjectState: mockDeriveProjectState,
  getDerivedStats: jest.fn(),
  isProjectComplete: mockIsProjectComplete,
}));

jest.unstable_mockModule('../../src/core/worktree.js', () => ({
  getRepoBasename: () => null,
  getRepoRoot: () => null,
  validateWorktree: jest.fn(),
  resolveWorktreeProjectByIdentifier: () => null,
  createWorktree: jest.fn(),
  createWorktreeFromBranch: jest.fn(),
  removeWorktree: jest.fn(() => ({ success: true })),
  pullMainBranch: jest.fn(() => ({ success: true })),
  branchExists: jest.fn(() => false),
}));

jest.unstable_mockModule('../../src/core/editor.js', () => ({
  openEditor: mockOpenEditor,
  getInputTemplate: () => 'template',
}));

jest.unstable_mockModule('../../src/prompts/planning.js', () => ({
  getPlanningPrompt: () => ({
    systemPrompt: 'planning system prompt',
    userMessage: 'planning user message',
  }),
}));

jest.unstable_mockModule('../../src/prompts/amend.js', () => ({
  getAmendPrompt: () => ({
    systemPrompt: 'amend system prompt',
    userMessage: 'amend user message',
  }),
}));

jest.unstable_mockModule('../../src/utils/validation.js', () => ({
  validateEnvironment: () => ({ valid: true, warnings: [], errors: [] }),
  reportValidation: jest.fn(),
  validateProjectName: () => true,
  sanitizeProjectName: (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

jest.unstable_mockModule('../../src/utils/config.js', () => ({
  formatModelDisplay: (model: string) => model,
  getModel: (scenario: string) => {
    if (scenario === 'nameGeneration') {
      return { model: 'sonnet', harness: 'claude' };
    }
    return { model: 'gpt-5.4', harness: 'codex' };
  },
  getWorktreeDefault: () => false,
  getSyncMainBranch: () => false,
}));

jest.unstable_mockModule('../../src/utils/name-generator.js', () => ({
  generateProjectNames: mockGenerateProjectNames,
}));

jest.unstable_mockModule('../../src/ui/name-picker.js', () => ({
  pickProjectName: mockPickProjectName,
}));

const { createPlanCommand } = await import('../../src/commands/plan.js');

describe('Plan Command - Legacy Auto Flag Compatibility', () => {
  const suiteTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-plan-command-'));
  let cwdSpy: jest.SpiedFunction<typeof process.cwd>;
  let tempDir: string;

  async function parsePlanCommand(args: string[]): Promise<void> {
    const command = createPlanCommand();
    command.exitOverride();
    await command.parseAsync(args, { from: 'user' });
  }

  beforeAll(() => {
    cwdSpy = jest.spyOn(process, 'cwd');
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(suiteTmpDir, 'case-'));
    cwdSpy.mockReturnValue(tempDir);

    mockRunInteractive.mockReset().mockResolvedValue(0);
    mockCreateRunner.mockClear();
    mockCommitPlanningArtifacts.mockReset().mockResolvedValue(undefined);
    mockOpenEditor.mockReset().mockResolvedValue('Build a samurai switch.');
    mockGenerateProjectNames.mockReset().mockResolvedValue(['samurai-switch', 'backup-name']);
    mockPickProjectName.mockReset().mockResolvedValue('samurai-switch');
    mockSelect.mockReset().mockResolvedValue('create');
    mockDeriveProjectState.mockReset().mockReturnValue({
      tasks: [{ id: '1', planFile: 'plans/1-existing-task.md', status: 'pending' }],
    });
    mockIsProjectComplete.mockReset().mockReturnValue(false);

    mockLogger.info.mockClear();
    mockLogger.success.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.newline.mockClear();
    mockLogger.debug.mockClear();
    mockShutdownHandler.init.mockClear();
    mockShutdownHandler.registerClaudeRunner.mockClear();
    mockShutdownHandler.onShutdown.mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  afterAll(() => {
    cwdSpy.mockRestore();
    fs.rmSync(suiteTmpDir, { recursive: true, force: true });
  });

  it('keeps parsing --auto and -y but hides them from help output', async () => {
    const command = createPlanCommand();
    const autoOption = command.options.find((opt) => opt.long === '--auto');

    expect(autoOption).toBeDefined();
    expect(command.helpInformation()).not.toContain('--auto');
    expect(command.helpInformation()).not.toContain('-y');

    await expect(parsePlanCommand(['--auto'])).resolves.toBeUndefined();
    expect(mockRunInteractive).toHaveBeenLastCalledWith(
      'planning system prompt',
      'planning user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );

    mockRunInteractive.mockClear();

    await expect(parsePlanCommand(['-y'])).resolves.toBeUndefined();
    expect(mockRunInteractive).toHaveBeenLastCalledWith(
      'planning system prompt',
      'planning user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );
  });

  it('runs plain raf plan in dangerous interactive mode by default', async () => {
    await parsePlanCommand([]);

    expect(mockGenerateProjectNames).toHaveBeenCalledWith('Build a samurai switch.');
    expect(mockPickProjectName).toHaveBeenCalledWith(['samurai-switch', 'backup-name']);
    expect(mockRunInteractive).toHaveBeenCalledWith(
      'planning system prompt',
      'planning user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Auto mode enabled')
    );
  });

  it('runs raf plan --amend in dangerous interactive mode with or without the legacy flag', async () => {
    const projectPath = path.join(tempDir, 'RAF', '1-existing');
    fs.mkdirSync(path.join(projectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, 'input.md'), 'Original scope');
    fs.writeFileSync(path.join(projectPath, 'plans', '1-existing-task.md'), '# task');

    await parsePlanCommand(['existing', '--amend']);
    expect(mockRunInteractive).toHaveBeenLastCalledWith(
      'amend system prompt',
      'amend user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );

    mockRunInteractive.mockClear();

    await parsePlanCommand(['existing', '--amend', '--auto']);
    expect(mockRunInteractive).toHaveBeenLastCalledWith(
      'amend system prompt',
      'amend user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );
    expect(mockLogger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Auto mode enabled')
    );
  });

  it('still prompts on duplicate project names even when the legacy flag is present', async () => {
    const existingProjectPath = path.join(tempDir, 'RAF', '1-existing');
    fs.mkdirSync(path.join(existingProjectPath, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(existingProjectPath, 'outcomes'), { recursive: true });
    fs.writeFileSync(path.join(existingProjectPath, 'decisions.md'), '# Project Decisions\n');

    await parsePlanCommand(['existing', '--auto']);

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Project 'existing' already exists"),
        choices: [
          { name: 'Yes, amend it', value: 'amend' },
          { name: 'No, create a new project', value: 'create' },
          { name: 'Cancel', value: 'cancel' },
        ],
      })
    );
    expect(mockRunInteractive).toHaveBeenCalledWith(
      'planning system prompt',
      'planning user message',
      { dangerouslySkipPermissions: true, cwd: undefined, interactiveIntent: 'planning' }
    );
  });
});
