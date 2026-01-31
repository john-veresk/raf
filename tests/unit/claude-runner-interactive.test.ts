import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

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

describe('ClaudeRunner - runInteractive', () => {
  // Save original stdin/stdout for restoration
  const originalStdin = process.stdin;
  const originalStdout = process.stdout;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecSync.mockReturnValue('/usr/local/bin/claude\n');
  });

  afterEach(() => {
    // Restore stdin/stdout
    Object.defineProperty(process, 'stdin', { value: originalStdin });
    Object.defineProperty(process, 'stdout', { value: originalStdout });
  });

  /**
   * Creates a mock PTY process for testing.
   */
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
    stdout.write = jest.fn();
    stdout.columns = 80;
    stdout.rows = 24;
    return stdout;
  }

  describe('argument passing', () => {
    it('should pass systemPrompt via --append-system-prompt and userMessage via -p', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive(
        'System instructions here',
        'User message here'
      );

      // Verify pty.spawn was called with correct arguments
      expect(mockPtySpawn).toHaveBeenCalledTimes(1);
      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];

      // Check --append-system-prompt flag and system prompt
      expect(spawnArgs).toContain('--append-system-prompt');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      expect(spawnArgs[appendIndex + 1]).toBe('System instructions here');

      // Check -p flag and user message
      expect(spawnArgs).toContain('-p');
      const pIndex = spawnArgs.indexOf('-p');
      expect(spawnArgs[pIndex + 1]).toBe('User message here');

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

    it('should use opus as default model', async () => {
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
      expect(spawnArgs).toContain('opus');

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
    it('should have correct order: --model, --append-system-prompt, -p', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'haiku' });
      const runPromise = runner.runInteractive(
        'System prompt content',
        'User message content'
      );

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];

      const modelIndex = spawnArgs.indexOf('--model');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const pIndex = spawnArgs.indexOf('-p');

      // Verify order: --model before --append-system-prompt before -p
      expect(modelIndex).toBeLessThan(appendIndex);
      expect(appendIndex).toBeLessThan(pIndex);

      // Verify values follow their flags
      expect(spawnArgs[modelIndex + 1]).toBe('haiku');
      expect(spawnArgs[appendIndex + 1]).toBe('System prompt content');
      expect(spawnArgs[pIndex + 1]).toBe('User message content');

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

  describe('no --dangerously-skip-permissions flag', () => {
    it('should NOT include --dangerously-skip-permissions for interactive sessions', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runInteractive('system', 'user');

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      // Interactive mode should NOT skip permissions - user needs to approve
      expect(spawnArgs).not.toContain('--dangerously-skip-permissions');

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });
});
