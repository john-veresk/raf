import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const suiteHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-claude-home-'));
let mockHomeDir = suiteHomeDir;

jest.unstable_mockModule('node:os', () => ({
  homedir: () => mockHomeDir,
  tmpdir: () => os.tmpdir(),
}));

// Create mock pty spawn before importing ClaudeRunner
const mockPtySpawn = jest.fn();
const mockExecSync = jest.fn();

jest.unstable_mockModule('node-pty', () => ({
  spawn: mockPtySpawn,
}));

jest.unstable_mockModule('node:child_process', () => ({
  spawn: jest.fn(),
  execSync: mockExecSync,
}));

// Import after mocking
const { ClaudeRunner } = await import('../../src/core/claude-runner.js');
const { getModel, resetConfigCache } = await import('../../src/utils/config.js');

describe('ClaudeRunner - runInteractive', () => {
  // Save original stdin/stdout for restoration
  const originalStdin = process.stdin;
  const originalStdout = process.stdout;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.rmSync(path.join(mockHomeDir, '.raf'), { recursive: true, force: true });
    resetConfigCache();
    mockExecSync.mockReturnValue('/usr/local/bin/claude\n');
  });

  afterEach(() => {
    resetConfigCache();
    // Restore stdin/stdout
    Object.defineProperty(process, 'stdin', { value: originalStdin });
    Object.defineProperty(process, 'stdout', { value: originalStdout });
  });

  afterAll(() => {
    fs.rmSync(suiteHomeDir, { recursive: true, force: true });
  });

  /**
   * Creates a mock PTY process for testing.
   */
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

  /**
   * Creates mock stdin for testing.
   */
  function createMockStdin() {
    const stdin = new EventEmitter() as any;
    stdin.isTTY = true;
    stdin.setRawMode = jest.fn();
    stdin.resume = jest.fn();
    stdin.pause = jest.fn();
    return stdin;
  }

  /**
   * Creates mock stdout for testing.
   */
  function createMockStdout() {
    const stdout = new EventEmitter() as any;
    stdout.isTTY = true;
    stdout.write = jest.fn();
    stdout.columns = 80;
    stdout.rows = 24;
    return stdout;
  }

  describe('argument passing', () => {
    it('should pass system prompt via --append-system-prompt and user message as positional arg', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('System instructions here', 'User message here');

      // Verify pty.spawn was called with correct arguments
      expect(mockPtySpawn).toHaveBeenCalledTimes(1);
      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];

      // System prompt should be passed via --append-system-prompt
      expect(spawnArgs).toContain('--append-system-prompt');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      expect(spawnArgs[appendIndex + 1]).toBe('System instructions here');

      // User message should be passed as positional argument (last in args)
      expect(spawnArgs).toContain('User message here');
      expect(spawnArgs[spawnArgs.length - 1]).toBe('User message here');

      // Should NOT use -p flag (print mode)
      expect(spawnArgs).not.toContain('-p');

      // Simulate process exit
      mockProc._exitCallback({ exitCode: 0 });
      const exitCode = await runPromise;
      expect(exitCode).toBe(0);
    });

    it('should pass model flag correctly', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.runInteractive('system', 'user');

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--model');
      expect(spawnArgs).toContain('sonnet');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });

    it('should use the configured execute model by default', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--model');
      const modelArgIndex = spawnArgs.indexOf('--model');
      expect(spawnArgs[modelArgIndex + 1]).toBe(getModel('execute').model);

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });

    it('should pass working directory to pty.spawn', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user', { cwd: '/custom/path' });

      const spawnOptions = mockPtySpawn.mock.calls[0][2];
      expect(spawnOptions.cwd).toBe('/custom/path');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });

  describe('flags order', () => {
    it('should have correct order: --model, --append-system-prompt, user message', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'haiku' });
      const runPromise = runner.runInteractive('My system prompt', 'My user message');

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];

      // Expected order: ['--model', 'haiku', '--append-system-prompt', 'system', 'user message']
      const modelIndex = spawnArgs.indexOf('--model');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const userMessageIndex = spawnArgs.indexOf('My user message');

      // Verify order: --model before --append-system-prompt before user message
      expect(modelIndex).toBeLessThan(appendIndex);
      expect(appendIndex).toBeLessThan(userMessageIndex);
      expect(spawnArgs[modelIndex + 1]).toBe('haiku');
      expect(spawnArgs[appendIndex + 1]).toBe('My system prompt');

      // User message should be last
      expect(spawnArgs[spawnArgs.length - 1]).toBe('My user message');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });

  describe('exit handling', () => {
    it('should return exit code from process', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      mockProc._exitCallback({ exitCode: 42 });
      const exitCode = await runPromise;
      expect(exitCode).toBe(42);
    });

    it('should return 0 for successful completion', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      mockProc._exitCallback({ exitCode: 0 });
      const exitCode = await runPromise;
      expect(exitCode).toBe(0);
    });
  });

  describe('environment passing', () => {
    it('should pass process.env to pty spawn in runInteractive', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      const spawnOptions = mockPtySpawn.mock.calls[0][2];
      // Interactive mode passes process.env directly
      // Note: effortLevel option was removed from ClaudeRunner in favor of per-task model resolution
      expect(spawnOptions.env).toBeDefined();

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });

  describe('--dangerously-skip-permissions flag', () => {
    it('should NOT include --dangerously-skip-permissions by default', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      // Interactive mode should NOT skip permissions by default
      expect(spawnArgs).not.toContain('--dangerously-skip-permissions');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });

    it('should include --dangerously-skip-permissions when option is true', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user', {
        dangerouslySkipPermissions: true,
      });

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--dangerously-skip-permissions');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });

    it('should NOT include --dangerously-skip-permissions when option is false', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user', {
        dangerouslySkipPermissions: false,
      });

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).not.toContain('--dangerously-skip-permissions');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });

    it('should place --dangerously-skip-permissions after --model and before --append-system-prompt', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.runInteractive('my system prompt', 'my user message', {
        dangerouslySkipPermissions: true,
      });

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      const modelIndex = spawnArgs.indexOf('--model');
      const skipIndex = spawnArgs.indexOf('--dangerously-skip-permissions');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const userMessageIndex = spawnArgs.indexOf('my user message');

      // --dangerously-skip-permissions should be after --model and before --append-system-prompt
      expect(skipIndex).toBeGreaterThan(modelIndex);
      expect(skipIndex).toBeLessThan(appendIndex);
      expect(appendIndex).toBeLessThan(userMessageIndex);

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });

  describe('terminal resize forwarding', () => {
    it('forwards resize events during interactive sessions and removes the listener on exit', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      expect(mockStdout.listenerCount('resize')).toBe(1);

      mockStdout.columns = 132;
      mockStdout.rows = 40;
      mockStdout.emit('resize');

      expect(mockProc.resize).toHaveBeenCalledWith(132, 40);

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;

      expect(mockStdout.listenerCount('resize')).toBe(0);
    });

    it('forwards resize events for resume sessions and does not leak listeners across runs', async () => {
      const firstProc = createMockPtyProcess();
      const secondProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValueOnce(firstProc).mockReturnValueOnce(secondProc);

      const runner = new ClaudeRunner();
      const firstRunPromise = runner.runResume();

      expect(mockStdout.listenerCount('resize')).toBe(1);

      mockStdout.columns = 100;
      mockStdout.rows = 30;
      mockStdout.emit('resize');
      expect(firstProc.resize).toHaveBeenCalledWith(100, 30);

      firstProc._exitCallback({ exitCode: 0 });
      await firstRunPromise;
      expect(mockStdout.listenerCount('resize')).toBe(0);

      const secondRunPromise = runner.runResume();
      expect(mockStdout.listenerCount('resize')).toBe(1);

      mockStdout.columns = 140;
      mockStdout.rows = 50;
      mockStdout.emit('resize');
      expect(secondProc.resize).toHaveBeenCalledWith(140, 50);
      expect(firstProc.resize).toHaveBeenCalledTimes(1);

      secondProc._exitCallback({ exitCode: 0 });
      await secondRunPromise;
      expect(mockStdout.listenerCount('resize')).toBe(0);
    });

    it('ignores resize events when stdout dimensions are unavailable', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      mockStdout.columns = undefined;
      mockStdout.rows = 40;
      mockStdout.emit('resize');

      mockStdout.columns = 120;
      mockStdout.rows = undefined;
      mockStdout.emit('resize');

      expect(mockProc.resize).not.toHaveBeenCalled();

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });
});
