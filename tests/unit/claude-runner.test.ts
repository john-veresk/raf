import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Create mock spawn before importing ClaudeRunner
const mockSpawn = jest.fn();
const mockExecSync = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawn: mockSpawn,
  execSync: mockExecSync,
}));

// Import after mocking
const { ClaudeRunner } = await import('../../src/core/claude-runner.js');

describe('ClaudeRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockExecSync.mockReturnValue('/usr/local/bin/claude\n');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('timeout handling', () => {
    /**
     * Creates a mock child process for testing.
     * The mock process emits 'close' event when kill() is called or after a delay.
     */
    function createMockProcess() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn().mockImplementation(() => {
        // Emit close event when killed
        setImmediate(() => proc.emit('close', 1));
      });
      return proc;
    }

    it('should set up timeout for each run() call', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 5 }); // 5 minutes

      // Verify process was spawned
      expect(mockSpawn).toHaveBeenCalledTimes(1);

      // Fast forward to just before timeout (5 minutes = 300000ms)
      jest.advanceTimersByTime(299999);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fast forward past timeout
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
    });

    it('should set up timeout for each runVerbose() call', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runVerbose('test prompt', { timeout: 3 }); // 3 minutes

      // Verify process was spawned
      expect(mockSpawn).toHaveBeenCalledTimes(1);

      // Fast forward to just before timeout (3 minutes = 180000ms)
      jest.advanceTimersByTime(179999);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fast forward past timeout
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
    });

    it('should use default timeout of 60 minutes when not specified', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {}); // No timeout specified

      // Fast forward to just before default timeout (60 minutes = 3600000ms)
      jest.advanceTimersByTime(3600000 - 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fast forward past timeout
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
    });

    it('should clear timeout when process completes normally', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 5 });

      // Emit some output and close the process normally
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);

      // Advance timer past timeout - should not cause any issues
      // since timeout was cleared
      jest.advanceTimersByTime(400000);
      expect(mockProc.kill).not.toHaveBeenCalled();
    });

    it('should apply fresh timeout for each consecutive call', async () => {
      const runner = new ClaudeRunner();

      // First call with 2 minute timeout
      const mockProc1 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc1);

      const runPromise1 = runner.run('first prompt', { timeout: 2 });

      // Complete first call quickly
      mockProc1.stdout.emit('data', Buffer.from('output'));
      mockProc1.emit('close', 0);
      await runPromise1;

      // Reset spawn mock for second call
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc2);

      // Second call with 3 minute timeout
      const runPromise2 = runner.run('second prompt', { timeout: 3 });

      // Fast forward 2.5 minutes - past first timeout but before second
      jest.advanceTimersByTime(150000);
      expect(mockProc2.kill).not.toHaveBeenCalled();

      // Fast forward another minute - past second timeout
      jest.advanceTimersByTime(60000);
      expect(mockProc2.kill).toHaveBeenCalledWith('SIGTERM');

      const result2 = await runPromise2;
      expect(result2.timedOut).toBe(true);
    });

    it('should set timedOut flag correctly on timeout', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 1 }); // 1 minute

      // Fast forward past timeout
      jest.advanceTimersByTime(60001);

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).toBe(1); // Process was killed
    });

    it('should not set timedOut flag when completed before timeout', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 10 });

      // Advance a bit but not to timeout
      jest.advanceTimersByTime(30000);

      // Complete process
      mockProc.stdout.emit('data', Buffer.from('output'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should use default timeout of 60 minutes when timeout is 0', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 0 });

      // Should NOT timeout at 0ms since timeout=0 should use default (60 minutes)
      // Just verify it doesn't immediately trigger
      jest.advanceTimersByTime(1000);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Complete the process normally before reaching the 60 minute timeout
      mockProc.stdout.emit('data', Buffer.from('output'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should use default timeout of 60 minutes when timeout is negative', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: -10 });

      // Should use default 60 minutes for negative values
      jest.advanceTimersByTime(3600000 - 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fast forward past 60 minutes
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
    });

    it('should use default timeout of 60 minutes when timeout is NaN', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      // @ts-expect-error - testing invalid input
      const runPromise = runner.run('test prompt', { timeout: 'invalid' });

      // Should use default 60 minutes for NaN
      jest.advanceTimersByTime(3600000 - 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fast forward past 60 minutes
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(true);
    });
  });

  describe('context overflow detection', () => {
    function createMockProcessWithImmediateClose() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn().mockImplementation(() => {
        // Use synchronous emission for tests without fake timer issues
        process.nextTick(() => proc.emit('close', 1));
      });
      return proc;
    }

    it('should detect context overflow and kill process', async () => {
      // Use real timers for this test since we're not testing timeout
      jest.useRealTimers();

      const mockProc = createMockProcessWithImmediateClose();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit context overflow message
      mockProc.stdout.emit('data', Buffer.from('Error: context length exceeded'));

      const result = await runPromise;
      expect(result.contextOverflow).toBe(true);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      // Restore fake timers for subsequent tests
      jest.useFakeTimers();
    });

    it('should detect various context overflow patterns', async () => {
      // Use real timers for this test since we're not testing timeout
      jest.useRealTimers();

      const patterns = [
        'token limit reached',
        'maximum context size',
        'context window full',
      ];

      for (const pattern of patterns) {
        const mockProc = createMockProcessWithImmediateClose();
        mockSpawn.mockReturnValue(mockProc);

        const runner = new ClaudeRunner();
        const runPromise = runner.run('test prompt', { timeout: 60 });

        mockProc.stdout.emit('data', Buffer.from(`Error: ${pattern}`));

        const result = await runPromise;
        expect(result.contextOverflow).toBe(true);
      }

      // Restore fake timers for subsequent tests
      jest.useFakeTimers();
    });
  });

  describe('output collection', () => {
    function createMockProcess() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn();
      return proc;
    }

    it('should collect all stdout output', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit multiple chunks
      mockProc.stdout.emit('data', Buffer.from('chunk1'));
      mockProc.stdout.emit('data', Buffer.from('chunk2'));
      mockProc.stdout.emit('data', Buffer.from('chunk3'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.output).toBe('chunk1chunk2chunk3');
    });

    it('should pass working directory to spawn', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60, cwd: '/custom/path' });

      mockProc.emit('close', 0);
      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cwd: '/custom/path' })
      );
    });
  });

  describe('model configuration', () => {
    function createMockProcess() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn();
      return proc;
    }

    it('should use opus as default model', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--model', 'opus']),
        expect.any(Object)
      );
    });

    it('should pass model to Claude CLI in run()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.run('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--model', 'sonnet']),
        expect.any(Object)
      );
    });

    it('should pass model to Claude CLI in runVerbose()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'haiku' });
      const runPromise = runner.runVerbose('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--model', 'haiku']),
        expect.any(Object)
      );
    });

    it('should include model flag in args order before prompt', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.run('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      const modelIndex = spawnArgs.indexOf('--model');
      const promptFlagIndex = spawnArgs.indexOf('-p');

      expect(modelIndex).toBeGreaterThanOrEqual(0);
      expect(promptFlagIndex).toBeGreaterThanOrEqual(0);
      expect(modelIndex).toBeLessThan(promptFlagIndex);
    });
  });

  describe('system prompt append flag', () => {
    function createMockProcess() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn();
      return proc;
    }

    it('should use --append-system-prompt flag in run()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const rafPrompt = 'RAF instructions here';
      const runPromise = runner.run(rafPrompt, { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--append-system-prompt');
      expect(spawnArgs).toContain(rafPrompt);

      // Verify the --append-system-prompt flag comes before the prompt
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const promptIndex = spawnArgs.indexOf(rafPrompt);
      expect(appendIndex).toBeLessThan(promptIndex);
      expect(spawnArgs[appendIndex + 1]).toBe(rafPrompt);
    });

    it('should use --append-system-prompt flag in runVerbose()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const rafPrompt = 'RAF verbose instructions here';
      const runPromise = runner.runVerbose(rafPrompt, { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--append-system-prompt');
      expect(spawnArgs).toContain(rafPrompt);

      // Verify the --append-system-prompt flag comes before the prompt
      const appendIndex = spawnArgs.indexOf('--append-system-prompt');
      const promptIndex = spawnArgs.indexOf(rafPrompt);
      expect(appendIndex).toBeLessThan(promptIndex);
      expect(spawnArgs[appendIndex + 1]).toBe(rafPrompt);
    });

    it('should pass minimal trigger prompt with -p flag', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('RAF instructions', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('-p');

      // The trigger prompt should follow -p
      const pIndex = spawnArgs.indexOf('-p');
      expect(spawnArgs[pIndex + 1]).toBe('Execute the task as described in the system prompt.');
    });

    it('should include all required flags in correct order', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner({ model: 'sonnet' });
      const runPromise = runner.run('test instructions', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];

      // Verify all expected flags are present
      expect(spawnArgs).toContain('--dangerously-skip-permissions');
      expect(spawnArgs).toContain('--model');
      expect(spawnArgs).toContain('sonnet');
      expect(spawnArgs).toContain('--append-system-prompt');
      expect(spawnArgs).toContain('-p');
    });
  });

  describe('retry isolation (timeout per attempt)', () => {
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

    it('should provide fresh timeout for each retry attempt', async () => {
      const runner = new ClaudeRunner();
      const timeoutMinutes = 2; // 2 minutes = 120000ms

      // Simulate multiple retry attempts like do.ts does
      // Each attempt should get its own fresh timeout

      // Attempt 1 - times out
      const mockProc1 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc1);

      const runPromise1 = runner.run('attempt 1', { timeout: timeoutMinutes });
      jest.advanceTimersByTime(120001); // Past timeout

      const result1 = await runPromise1;
      expect(result1.timedOut).toBe(true);

      // Attempt 2 - fresh timeout, succeeds
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc2);

      const runPromise2 = runner.run('attempt 2', { timeout: timeoutMinutes });

      // Only advance 1 minute - should not timeout
      jest.advanceTimersByTime(60000);
      expect(mockProc2.kill).not.toHaveBeenCalled();

      // Complete successfully
      mockProc2.stdout.emit('data', Buffer.from('success'));
      mockProc2.emit('close', 0);

      const result2 = await runPromise2;
      expect(result2.timedOut).toBe(false);
      expect(result2.output).toBe('success');
    });

    it('should not share elapsed time between attempts', async () => {
      const runner = new ClaudeRunner();
      const timeoutMinutes = 5; // 5 minutes

      // First attempt runs for 4 minutes then fails
      const mockProc1 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc1);

      const runPromise1 = runner.run('attempt 1', { timeout: timeoutMinutes });

      // Run for 4 minutes (240000ms)
      jest.advanceTimersByTime(240000);

      // Fail without timeout
      mockProc1.stdout.emit('data', Buffer.from('<promise>FAILED</promise>'));
      mockProc1.emit('close', 1);

      const result1 = await runPromise1;
      expect(result1.timedOut).toBe(false);

      // Second attempt should have FULL 5 minutes, not 1 minute remaining
      const mockProc2 = createMockProcess();
      mockSpawn.mockReturnValue(mockProc2);

      const runPromise2 = runner.run('attempt 2', { timeout: timeoutMinutes });

      // Advance 4 minutes again - should NOT timeout
      jest.advanceTimersByTime(240000);
      expect(mockProc2.kill).not.toHaveBeenCalled();

      // Advance past total timeout for this attempt
      jest.advanceTimersByTime(60001);
      expect(mockProc2.kill).toHaveBeenCalledWith('SIGTERM');

      const result2 = await runPromise2;
      expect(result2.timedOut).toBe(true);
    });
  });
});
