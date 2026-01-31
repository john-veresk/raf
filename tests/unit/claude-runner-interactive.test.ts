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
    it('should combine systemPrompt and userMessage into --append-system-prompt', async () => {
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

      // Check --append-system-prompt flag contains combined prompt
      expect(spawnArgs).toContain('--append-system-prompt');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const combinedPrompt = spawnArgs[appendIndex + 1];
      expect(combinedPrompt).toContain('System instructions here');
      expect(combinedPrompt).toContain('User message here');

      // Should NOT use -p flag (it triggers non-interactive mode)
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
    it('should have correct order: --model, --append-system-prompt', async () => {
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

      // Verify order: --model before --append-system-prompt
      expect(modelIndex).toBeLessThan(appendIndex);

      // Verify values follow their flags
      expect(spawnArgs[modelIndex + 1]).toBe('haiku');

      // Combined prompt should contain both system and user content
      const combinedPrompt = spawnArgs[appendIndex + 1];
      expect(combinedPrompt).toContain('System prompt content');
      expect(combinedPrompt).toContain('User message content');

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

    it('should place --dangerously-skip-permissions after --model', async () => {
      const mockProc = createMockPtyProcess();
      const mockStdin = createMockStdin();
      const mockStdout = createMockStdout();

      Object.defineProperty(process, 'stdin', { value: mockStdin, configurable: true });
      Object.defineProperty(process, 'stdout', { value: mockStdout, configurable: true });

      mockPtySpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.runInteractive('system', 'user', {
        dangerouslySkipPermissions: true,
      });

      const spawnArgs = mockPtySpawn.mock.calls[0][1] as string[];
      const modelIndex = spawnArgs.indexOf('--model');
      const skipIndex = spawnArgs.indexOf('--dangerously-skip-permissions');
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');

      // --dangerously-skip-permissions should be after --model and before --append-system-prompt
      expect(skipIndex).toBeGreaterThan(modelIndex);
      expect(skipIndex).toBeLessThan(appendIndex);

      mockProc._exitCallback({ exitCode: 0 });
      await runPromise;
    });
  });
});
