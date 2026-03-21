import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

const mockSpawn = jest.fn();
const mockExecSync = jest.fn();

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
  spawn: jest.fn(),
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

describe('CodexRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecSync.mockReturnValue('/usr/local/bin/codex\n');
    mockExistsSync.mockReturnValue(false);
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
});
