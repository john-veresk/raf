import { jest } from '@jest/globals';

const mockCreateRunner = jest.fn();
const mockLogger = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  newline: jest.fn(),
  debug: jest.fn(),
};

jest.unstable_mockModule('../../src/core/runner-factory.js', () => ({
  createRunner: mockCreateRunner,
}));

jest.unstable_mockModule('../../src/core/shutdown-handler.js', () => ({
  shutdownHandler: {
    init: jest.fn(),
    registerClaudeRunner: jest.fn(),
    onShutdown: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/core/git.js', () => ({
  commitPlanningArtifacts: jest.fn(),
}));

jest.unstable_mockModule('../../src/core/editor.js', () => ({
  openEditor: jest.fn(),
  getInputTemplate: () => 'template',
}));

jest.unstable_mockModule('../../src/prompts/planning.js', () => ({
  getPlanningPrompt: () => ({ systemPrompt: 'planning system prompt', userMessage: 'planning user message' }),
}));

jest.unstable_mockModule('../../src/prompts/amend.js', () => ({
  getAmendPrompt: () => ({ systemPrompt: 'amend system prompt', userMessage: 'amend user message' }),
}));

jest.unstable_mockModule('../../src/utils/name-generator.js', () => ({
  generateProjectNames: jest.fn(),
}));

jest.unstable_mockModule('../../src/ui/name-picker.js', () => ({
  pickProjectName: jest.fn(),
}));

jest.unstable_mockModule('../../src/core/state-derivation.js', () => ({
  deriveProjectState: jest.fn(),
  getDerivedStats: jest.fn(),
  isProjectComplete: jest.fn(() => false),
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

jest.unstable_mockModule('../../src/utils/config.js', () => ({
  getModel: () => ({ model: 'gpt-5.4', harness: 'codex' }),
  formatModelDisplay: jest.fn(),
  getWorktreeDefault: () => false,
  getSyncMainBranch: () => false,
  isValidModelName: () => true,
  getResolvedConfig: () => ({
    context: {
      maxCompletedTasks: 8,
      maxPendingTasks: 8,
      maxDecisionItems: 12,
      recentOutcomeLimit: 3,
      goalMaxChars: 500,
      outcomeSummaryMaxChars: 280,
    },
  }),
}));

jest.unstable_mockModule('../../src/utils/validation.js', () => ({
  validateEnvironment: () => ({ valid: true, warnings: [], errors: [] }),
  reportValidation: jest.fn(),
  validateProjectName: () => true,
  sanitizeProjectName: (name: string) => name,
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

const { createPlanCommand } = await import('../../src/commands/plan.js');

describe('Plan Command - Codex Resume Guard', () => {
  async function parsePlanCommand(args: string[]): Promise<void> {
    const command = createPlanCommand();
    command.exitOverride();
    await command.parseAsync(args, { from: 'user' });
  }

  beforeEach(() => {
    mockCreateRunner.mockClear();
    mockLogger.info.mockClear();
    mockLogger.success.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.newline.mockClear();
    mockLogger.debug.mockClear();
  });

  it('rejects raf plan --resume before trying to start a Codex session', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit');
    }) as typeof process.exit);

    await expect(parsePlanCommand(['--resume', 'abc123'])).rejects.toThrow('process.exit');

    expect(mockCreateRunner).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      1,
      '`raf plan --resume` is not supported when the planning harness is Codex.'
    );
    expect(mockLogger.error).toHaveBeenNthCalledWith(
      2,
      'Codex planning sessions rely on a startup-only request_user_input override, so RAF cannot reopen them with the same guarantee.'
    );

    exitSpy.mockRestore();
  });
});
