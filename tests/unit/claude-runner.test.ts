import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Create mock spawn before importing ClaudeRunner
const mockSpawn = jest.fn();
const mockExecSync = jest.fn();

// Create mock fs functions
const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
const mockReadFileSync = jest.fn();

// Create mock git functions
const mockGetHeadCommitHash = jest.fn();
const mockGetHeadCommitMessage = jest.fn();
const mockIsFileCommittedInHead = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({
  spawn: mockSpawn,
  execSync: mockExecSync,
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

// Import after mocking
const { ClaudeRunner, COMPLETION_GRACE_PERIOD_MS, COMPLETION_HARD_MAX_MS, COMMIT_POLL_INTERVAL_MS, OUTCOME_POLL_INTERVAL_MS } = await import('../../src/core/claude-runner.js');

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

  describe('verbose stream-json output', () => {
    function createMockProcess() {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const proc = new EventEmitter() as any;
      proc.stdout = stdout;
      proc.stderr = stderr;
      proc.kill = jest.fn();
      return proc;
    }

    it('should include --output-format stream-json and --verbose flags in runVerbose()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runVerbose('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--output-format');
      expect(spawnArgs).toContain('stream-json');
      expect(spawnArgs).toContain('--verbose');
    });

    it('should NOT include --output-format or --verbose flags in run()', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      mockProc.emit('close', 0);
      await runPromise;

      const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
      expect(spawnArgs).not.toContain('--output-format');
      expect(spawnArgs).not.toContain('stream-json');
      expect(spawnArgs).not.toContain('--verbose');
    });

    it('should extract text from NDJSON assistant events', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runVerbose('test prompt', { timeout: 60 });

      // Emit NDJSON lines like real stream-json output
      const systemEvent = JSON.stringify({ type: 'system', subtype: 'init' });
      const assistantEvent = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Task complete.\n<promise>COMPLETE</promise>' }] },
      });
      const resultEvent = JSON.stringify({ type: 'result', subtype: 'success', result: 'Task complete.' });

      mockProc.stdout.emit('data', Buffer.from(systemEvent + '\n' + assistantEvent + '\n' + resultEvent + '\n'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.output).toContain('Task complete.');
      expect(result.output).toContain('<promise>COMPLETE</promise>');
    });

    it('should extract text from tool_use NDJSON events without adding to output', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runVerbose('test prompt', { timeout: 60 });

      const toolEvent = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/test.ts' } }] },
      });

      mockProc.stdout.emit('data', Buffer.from(toolEvent + '\n'));
      mockProc.emit('close', 0);

      const result = await runPromise;
      // Tool use events don't add text to output
      expect(result.output).toBe('');
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

  describe('completion detection', () => {
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

    beforeEach(() => {
      // Default: no outcome file exists
      mockExistsSync.mockReturnValue(false);
    });

    it('should start grace period when COMPLETE marker detected in stdout', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit output with completion marker
      mockProc.stdout.emit('data', Buffer.from('Writing outcome...\n<promise>COMPLETE</promise>\n'));

      // Process should not be killed immediately
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Advance to just before grace period expires
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS - 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Advance past grace period
      jest.advanceTimersByTime(2);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(false); // Not a timeout, it's a grace period kill
      expect(result.output).toContain('<promise>COMPLETE</promise>');
    });

    it('should start grace period when FAILED marker detected in stdout', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit output with failed marker
      mockProc.stdout.emit('data', Buffer.from('<promise>FAILED</promise>\nReason: test error'));

      // Advance past grace period
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(false);
    });

    it('should detect marker across multiple stdout chunks', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit partial output (no marker yet)
      mockProc.stdout.emit('data', Buffer.from('Working on task...\n'));
      jest.advanceTimersByTime(10000);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Emit marker in second chunk
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Grace period starts now - advance past it
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should not start grace period if process exits before grace period expires', async () => {
      const mockProc = createMockProcess();
      // Override kill to NOT auto-close (so we can test natural close)
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit completion marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Process exits naturally before grace period
      jest.advanceTimersByTime(5000);
      mockProc.emit('close', 0);

      const result = await runPromise;
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain('<promise>COMPLETE</promise>');

      // Grace period should have been cleaned up - advancing further should not call kill
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS);
      expect(mockProc.kill).not.toHaveBeenCalled();
    });

    it('should detect completion via outcome file polling', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const outcomePath = '/test/project/outcomes/001-task.md';

      // Outcome file doesn't exist initially
      mockExistsSync.mockReturnValue(false);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        outcomeFilePath: outcomePath,
      });

      // No output marker in stdout - just regular output
      mockProc.stdout.emit('data', Buffer.from('Working on task...'));

      // After some time, outcome file appears with marker
      jest.advanceTimersByTime(OUTCOME_POLL_INTERVAL_MS - 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Mock that file now exists with COMPLETE marker
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtimeMs: Date.now() + 1000 });
      mockReadFileSync.mockReturnValue('# Outcome\n\n<promise>COMPLETE</promise>\n');

      // Advance to trigger poll
      jest.advanceTimersByTime(2);

      // Grace period started - advance past it
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should not trigger on pre-existing outcome file from previous run', async () => {
      const mockProc = createMockProcess();
      // Override kill to NOT auto-close
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      const outcomePath = '/test/project/outcomes/001-task.md';

      // Outcome file already exists from previous failed run
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ mtimeMs: 1000 }); // Old timestamp
      mockReadFileSync.mockReturnValue('# Outcome\n\n<promise>FAILED</promise>\n');

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        outcomeFilePath: outcomePath,
      });

      // Advance past several poll intervals - should not trigger because mtime unchanged
      jest.advanceTimersByTime(OUTCOME_POLL_INTERVAL_MS * 5);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Complete normally
      mockProc.stdout.emit('data', Buffer.from('done'));
      mockProc.emit('close', 0);

      await runPromise;
    });

    it('should work with runVerbose() too', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.runVerbose('test prompt', { timeout: 60 });

      // Emit output with completion marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Advance past grace period
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      const result = await runPromise;
      expect(result.timedOut).toBe(false);
    });

    it('should not start multiple grace periods for repeated markers', async () => {
      const mockProc = createMockProcess();
      // Override kill to NOT auto-close (to test multiple markers)
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', { timeout: 60 });

      // Emit first marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Advance halfway through grace period
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS / 2);

      // Emit second marker (e.g., Claude reading back what it wrote)
      mockProc.stdout.emit('data', Buffer.from('Verified: <promise>COMPLETE</promise>\n'));

      // Advance remaining grace period from FIRST detection
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS / 2 + 1);

      // Should be killed once (from the first grace period)
      expect(mockProc.kill).toHaveBeenCalledTimes(1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      // Close process manually for cleanup
      mockProc.emit('close', 1);
      await runPromise;
    });
  });

  describe('commit verification during grace period', () => {
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

    const commitContext = {
      preExecutionHead: 'aaa111',
      expectedPrefix: 'RAF[005:001]',
      outcomeFilePath: '/project/outcomes/001-task.md',
    };

    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
      mockGetHeadCommitHash.mockReturnValue('aaa111');
      mockGetHeadCommitMessage.mockReturnValue(null);
      mockIsFileCommittedInHead.mockReturnValue(false);
    });

    it('should kill immediately after grace period when commit is verified within grace period', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      // Commit lands during grace period
      mockGetHeadCommitHash.mockReturnValue('bbb222');
      mockGetHeadCommitMessage.mockReturnValue('RAF[005:001] Add feature');
      mockIsFileCommittedInHead.mockReturnValue(true);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Advance to grace period expiry - commit already verified
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should extend grace period and find commit during extended polling', async () => {
      const mockProc = createMockProcess();
      // Override kill to NOT auto-close so we can test polling
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      // Commit not yet made
      mockGetHeadCommitHash.mockReturnValue('aaa111');

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Advance past initial grace period - commit not found, should extend
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      // Should NOT be killed yet because commit verification failed and we extend
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Now simulate commit landing during extended polling
      mockGetHeadCommitHash.mockReturnValue('bbb222');
      mockGetHeadCommitMessage.mockReturnValue('RAF[005:001] Add feature');
      mockIsFileCommittedInHead.mockReturnValue(true);

      // Advance to next commit poll interval
      jest.advanceTimersByTime(COMMIT_POLL_INTERVAL_MS);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      // Clean up
      mockProc.emit('close', 1);
      await runPromise;
    });

    it('should kill after hard maximum when commit never lands', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      // Commit never lands
      mockGetHeadCommitHash.mockReturnValue('aaa111');

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Advance past initial grace period
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Advance to hard maximum
      jest.advanceTimersByTime(COMPLETION_HARD_MAX_MS - COMPLETION_GRACE_PERIOD_MS);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should NOT extend grace period for FAILED markers', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      // Commit never lands (doesn't matter - FAILED shouldn't check)
      mockGetHeadCommitHash.mockReturnValue('aaa111');

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit FAILED marker (not COMPLETE)
      mockProc.stdout.emit('data', Buffer.from('<promise>FAILED</promise>\n'));

      // Grace period should expire normally without extension
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should work without commitContext (backward compatible)', async () => {
      const mockProc = createMockProcess();
      mockSpawn.mockReturnValue(mockProc);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        // No commitContext provided
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Grace period should expire normally (no commit check)
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      await runPromise;
    });

    it('should verify commit message prefix matches', async () => {
      const mockProc = createMockProcess();
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      // HEAD changed but message doesn't match expected prefix
      mockGetHeadCommitHash.mockReturnValue('bbb222');
      mockGetHeadCommitMessage.mockReturnValue('RAF[005:002] Wrong task');
      mockIsFileCommittedInHead.mockReturnValue(true);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Grace period expires - commit message doesn't match, should extend
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // Fix commit message
      mockGetHeadCommitMessage.mockReturnValue('RAF[005:001] Correct task');

      // Next poll finds it
      jest.advanceTimersByTime(COMMIT_POLL_INTERVAL_MS);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      mockProc.emit('close', 1);
      await runPromise;
    });

    it('should verify outcome file is committed', async () => {
      const mockProc = createMockProcess();
      mockProc.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProc);

      // HEAD changed and message matches, but file not committed
      mockGetHeadCommitHash.mockReturnValue('bbb222');
      mockGetHeadCommitMessage.mockReturnValue('RAF[005:001] Add feature');
      mockIsFileCommittedInHead.mockReturnValue(false);

      const runner = new ClaudeRunner();
      const runPromise = runner.run('test prompt', {
        timeout: 60,
        commitContext,
      });

      // Emit COMPLETE marker
      mockProc.stdout.emit('data', Buffer.from('<promise>COMPLETE</promise>\n'));

      // Grace period expires - file not committed, should extend
      jest.advanceTimersByTime(COMPLETION_GRACE_PERIOD_MS + 1);
      expect(mockProc.kill).not.toHaveBeenCalled();

      // File now committed
      mockIsFileCommittedInHead.mockReturnValue(true);

      // Next poll finds it
      jest.advanceTimersByTime(COMMIT_POLL_INTERVAL_MS);
      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');

      mockProc.emit('close', 1);
      await runPromise;
    });
  });
});
