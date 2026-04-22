import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

const mockSpawn = jest.fn();
const mockExecSync = jest.fn();
const mockExecFileSync = jest.fn();
const mockPtySpawn = jest.fn();

const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockReadFileSync = jest.fn();

const mockGetHeadCommitHash = jest.fn();
const mockGetHeadCommitMessage = jest.fn();
const mockDidHeadCommitTouchFiles = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawn: mockSpawn,
  execSync: mockExecSync,
  execFileSync: mockExecFileSync,
}));

jest.unstable_mockModule('node-pty', () => ({
  spawn: mockPtySpawn,
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    existsSync: mockExistsSync,
    statSync: mockStatSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  readFileSync: mockReadFileSync,
}));

jest.unstable_mockModule('../../src/core/git.js', () => ({
  getHeadCommitHash: mockGetHeadCommitHash,
  getHeadCommitMessage: mockGetHeadCommitMessage,
  didHeadCommitTouchFiles: mockDidHeadCommitTouchFiles,
}));

const { CodexRunner } = await import('../../src/core/codex-runner.js');

function createMockProcess() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.kill = jest.fn().mockImplementation(() => {
    setImmediate(() => proc.emit('close', 1));
  });
  return proc;
}

function createMockPtyProcess() {
  const proc = new EventEmitter() as any;
  proc.write = jest.fn();
  proc.kill = jest.fn();
  proc.resize = jest.fn();
  proc.onData = jest.fn().mockImplementation((callback) => {
    proc._dataCallback = callback;
  });
  proc.onExit = jest.fn().mockImplementation((callback) => {
    proc._exitCallback = callback;
  });
  return proc;
}

function createMockStdin() {
  const stdin = new EventEmitter() as any;
  stdin.isTTY = true;
  stdin.setRawMode = jest.fn();
  stdin.resume = jest.fn();
  stdin.pause = jest.fn();
  return stdin;
}

function createMockStdout() {
  const stdout = new EventEmitter() as any;
  stdout.isTTY = true;
  stdout.write = jest.fn();
  stdout.columns = 80;
  stdout.rows = 24;
  return stdout;
}

describe('CodexRunner', () => {
  const originalStdin = process.stdin;
  const originalStdout = process.stdout;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecSync.mockReturnValue('/usr/local/bin/codex\n');
    mockExecFileSync.mockReturnValue('default_mode_request_user_input  under development  false\n');
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin });
    Object.defineProperty(process, 'stdout', { value: originalStdout });
  });

  it('uses dangerous execution mode by default for non-interactive runs', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.run('test prompt');

    const spawnArgs = mockSpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(spawnArgs).not.toContain('--full-auto');

    mockProc.emit('close', 0);
    await runPromise;
  });

  it('uses full-auto execution mode when configured', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4', codexExecutionMode: 'fullAuto' });
    const runPromise = runner.run('test prompt');

    const spawnArgs = mockSpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toContain('--full-auto');
    expect(spawnArgs).not.toContain('--dangerously-bypass-approvals-and-sandbox');

    mockProc.emit('close', 0);
    await runPromise;
  });

  it('passes the fast service tier override for non-interactive Codex runs when enabled', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4', fast: true });
    const runPromise = runner.run('test prompt');

    const spawnArgs = mockSpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toContain('-c');
    expect(spawnArgs).toContain('service_tier="fast"');

    mockProc.emit('close', 0);
    await runPromise;
  });

  it('returns usageData from run() when turn.completed includes usage', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.run('test prompt');

    mockProc.stdout.emit('data', Buffer.from(`${JSON.stringify({
      type: 'turn.completed',
      model: 'gpt-5.4',
      usage: {
        input_tokens: 1000,
        output_tokens: 250,
      },
    })}\n`));
    mockProc.emit('close', 0);

    const result = await runPromise;
    expect(result.usageData).toEqual({
      inputTokens: 1000,
      outputTokens: 250,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {
        'gpt-5.4': {
          inputTokens: 1000,
          outputTokens: 250,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          costUsd: null,
        },
      },
      totalCostUsd: null,
    });
  });

  it('accumulates usageData across multiple turn.completed events', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.run('test prompt');

    const firstTurn = JSON.stringify({
      type: 'turn.completed',
      model: 'gpt-5.4',
      usage: {
        input_tokens: 1000,
        output_tokens: 250,
      },
    });
    const secondTurn = JSON.stringify({
      type: 'turn.completed',
      model: 'gpt-5.4',
      usage: {
        input_tokens: 500,
        output_tokens: 150,
      },
    });

    mockProc.stdout.emit('data', Buffer.from(firstTurn + '\n' + secondTurn + '\n'));
    mockProc.emit('close', 0);

    const result = await runPromise;
    expect(result.usageData).toEqual({
      inputTokens: 1500,
      outputTokens: 400,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      modelUsage: {
        'gpt-5.4': {
          inputTokens: 1500,
          outputTokens: 400,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          costUsd: null,
        },
      },
      totalCostUsd: null,
    });
  });

  it('returns undefined usageData when no turn.completed usage event is present', async () => {
    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.run('test prompt');

    mockProc.stdout.emit('data', Buffer.from(`${JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: 'Done.',
      },
    })}\n`));
    mockProc.emit('close', 0);

    const result = await runPromise;
    expect(result.usageData).toBeUndefined();
  });

  it('uses dangerous interactive mode when requested for runInteractive()', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.runInteractive('system prompt', 'user message', {
      dangerouslySkipPermissions: true,
    });

    const spawnArgs = mockPtySpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(spawnArgs[spawnArgs.length - 1]).toContain('[System Instructions]');

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;
  });

  it('passes the fast service tier override for interactive Codex runs when enabled', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4', fast: true });
    const runPromise = runner.runInteractive('system prompt', 'user message');

    const spawnArgs = mockPtySpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).toContain('-c');
    expect(spawnArgs).toContain('service_tier="fast"');
    expect(spawnArgs[0]).toBe('-m');
    expect(spawnArgs).not.toContain('exec');

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;
  });

  it('enables the verified request_user_input feature for planning sessions', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.runInteractive('system prompt', 'user message', {
      interactiveIntent: 'planning',
    });

    const spawnArgs = mockPtySpawn.mock.calls[0]?.[1] as string[];
    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/local/bin/codex',
      ['features', 'list'],
      { encoding: 'utf-8' }
    );
    expect(spawnArgs).toContain('--enable');
    expect(spawnArgs).toContain('default_mode_request_user_input');

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;
  });

  it('fails before startup when Codex planning support is unavailable', async () => {
    mockExecFileSync.mockImplementation((_path: string, args: string[]) => {
      if (args[0] === 'features') {
        return 'collaboration_modes  removed  true\n';
      }
      if (args[0] === '--version') {
        return 'codex-cli 0.120.0\n';
      }
      return '';
    });

    const runner = new CodexRunner({ model: 'gpt-5.4' });

    await expect(
      runner.runInteractive('system prompt', 'user message', { interactiveIntent: 'planning' })
    ).rejects.toThrow(
      'Codex CLI codex-cli 0.120.0 cannot start RAF planning sessions with request_user_input support.'
    );

    expect(mockPtySpawn).not.toHaveBeenCalled();
  });

  it('does not force dangerous interactive mode when the option is false', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.runInteractive('system prompt', 'user message', {
      dangerouslySkipPermissions: false,
    });

    const spawnArgs = mockPtySpawn.mock.calls[0]?.[1] as string[];
    expect(spawnArgs).not.toContain('--dangerously-bypass-approvals-and-sandbox');

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;
  });

  it('forwards terminal resize events for interactive Codex sessions and cleans up listeners on exit', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.runInteractive('system prompt', 'user message');

    expect(mockStdout.listenerCount('resize')).toBe(1);

    mockStdout.columns = 118;
    mockStdout.rows = 36;
    mockStdout.emit('resize');
    expect(mockProc.resize).toHaveBeenCalledWith(118, 36);

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;

    expect(mockStdout.listenerCount('resize')).toBe(0);
  });

  it('does not forward resize events when stdout is not a tty', async () => {
    const mockProc = createMockPtyProcess();
    const mockStdin = createMockStdin();
    const mockStdout = createMockStdout();
    mockStdout.isTTY = false;

    Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

    mockPtySpawn.mockReturnValue(mockProc);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.runInteractive('system prompt', 'user message');

    expect(mockStdout.listenerCount('resize')).toBe(0);

    mockStdout.columns = 118;
    mockStdout.rows = 36;
    mockStdout.emit('resize');
    expect(mockProc.resize).not.toHaveBeenCalled();

    mockProc._exitCallback({ exitCode: 0 });
    await runPromise;
  });

  it('marks non-interactive runs as failed when COMPLETE is emitted before required artifacts are verified', async () => {
    jest.useFakeTimers();

    const mockProc = createMockProcess();
    mockSpawn.mockReturnValue(mockProc);

    mockGetHeadCommitHash.mockReturnValue('aaa111');
    mockGetHeadCommitMessage.mockReturnValue('RAF[005:01] Add feature');
    mockDidHeadCommitTouchFiles.mockReturnValue(false);

    const runner = new CodexRunner({ model: 'gpt-5.4' });
    const runPromise = runner.run('test prompt', {
      timeout: 60,
      commitContext: {
        preExecutionHead: 'aaa111',
        expectedPrefix: 'RAF[005:01]',
        requiredArtifactPaths: ['/project/outcomes/01-task.md'],
      },
    });

    mockProc.stdout.emit('data', Buffer.from(`${JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: '<promise>COMPLETE</promise>',
      },
    })}\n`));
    mockProc.emit('close', 0);

    const result = await runPromise;
    expect(result.commitVerificationFailed).toBe(true);

    jest.useRealTimers();
  });
});
