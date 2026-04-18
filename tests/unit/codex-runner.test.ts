import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

const mockSpawn = jest.fn();
const mockExecSync = jest.fn();
const mockPtySpawn = jest.fn();

const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockReadFileSync = jest.fn();

const mockGetHeadCommitHash = jest.fn();
const mockGetHeadCommitMessage = jest.fn();
const mockIsFileCommittedInHead = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawn: mockSpawn,
  execSync: mockExecSync,
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
  isFileCommittedInHead: mockIsFileCommittedInHead,
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
      modelUsage: {
        'gpt-5.4': {
          inputTokens: 1000,
          outputTokens: 250,
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
      modelUsage: {
        'gpt-5.4': {
          inputTokens: 1500,
          outputTokens: 400,
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
});
