import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';

// Helper to create a mock spawn that returns a fake ChildProcess
function createMockSpawn(stdoutData: string | null, exitCode: number = 0) {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as any;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.kill = jest.fn();

  // Schedule data emission and close after spawn is called
  setTimeout(() => {
    if (stdoutData !== null) {
      stdout.emit('data', Buffer.from(stdoutData));
    }
    proc.emit('close', exitCode);
  }, 0);

  return proc;
}

// Mock spawn before importing the module
const mockSpawn = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  spawn: mockSpawn,
  execSync: jest.fn(), // keep available for transitive imports
}));

// Import after mocking
const { generateProjectName, generateProjectNames, sanitizeGeneratedName } =
  await import('../../src/utils/name-generator.js');

describe('Name Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProjectName', () => {
    it('should return sanitized name from Claude response', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('user-auth-system\n'));

      const result = await generateProjectName('Build a user authentication system');

      expect(result).toBe('user-auth-system');
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'haiku', '--no-session-persistence', '-p']),
        expect.any(Object)
      );
    });

    it('should pass --no-session-persistence flag', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('test-name\n'));

      await generateProjectName('Test project');

      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args).toContain('--no-session-persistence');
    });

    it('should sanitize response with quotes', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('"api-rate-limiter"'));

      const result = await generateProjectName('Create an API rate limiting service');

      expect(result).toBe('api-rate-limiter');
    });

    it('should sanitize response with special characters', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('Some Project! Name'));

      const result = await generateProjectName('Some project description');

      expect(result).toBe('some-project-name');
    });

    it('should fall back to word extraction when Claude fails', async () => {
      mockSpawn.mockReturnValue(createMockSpawn(null, 1));

      const result = await generateProjectName('Build a user authentication system with OAuth');

      expect(result).toBe('build-user-authentication');
    });

    it('should fall back to word extraction when Claude returns empty', async () => {
      mockSpawn.mockReturnValue(createMockSpawn(''));

      const result = await generateProjectName('Implement caching layer for database');

      expect(result).toBe('implement-caching-layer');
    });

    it('should fall back to word extraction when Claude returns single char', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('a'));

      const result = await generateProjectName('Add new logging functionality');

      expect(result).toBe('add-new-logging');
    });

    it('should return "project" when description has no meaningful words', async () => {
      mockSpawn.mockReturnValue(createMockSpawn(null, 1));

      const result = await generateProjectName('a b c');

      expect(result).toBe('project');
    });

    it('should truncate long names from Claude', async () => {
      const longName =
        'this-is-a-very-long-project-name-that-exceeds-the-maximum-allowed-length-for-folder-names';
      mockSpawn.mockReturnValue(createMockSpawn(longName));

      const result = await generateProjectName('Some project');

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle multiline response', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('project-name\nSome extra explanation\n'));

      const result = await generateProjectName('Some project');

      // Should take full trimmed output
      expect(result).toBe('project-name-some-extra-explanation');
    });

    it('should convert uppercase to lowercase', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('API-Gateway-Service'));

      const result = await generateProjectName('Build an API gateway');

      expect(result).toBe('api-gateway-service');
    });

    it('should handle spawn error gracefully', async () => {
      const proc = new EventEmitter() as any;
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.kill = jest.fn();
      setTimeout(() => {
        proc.emit('error', new Error('ENOENT'));
      }, 0);
      mockSpawn.mockReturnValue(proc);

      const result = await generateProjectName('Build something');

      expect(result).toBe('build-something');
    });
  });

  describe('generateProjectNames', () => {
    it('should return multiple sanitized names from Claude response', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('phoenix-rise\nturbo-boost\nbug-squasher\ncatalyst\nmerlin\n')
      );

      const result = await generateProjectNames('Build a user authentication system');

      expect(result).toEqual([
        'phoenix-rise',
        'turbo-boost',
        'bug-squasher',
        'catalyst',
        'merlin',
      ]);
      expect(mockSpawn).toHaveBeenCalledTimes(1);
      // Verify the prompt contains the multi-name generation prompt
      const promptArg = (mockSpawn.mock.calls[0][1] as string[]).at(-1);
      expect(promptArg).toContain('Generate 5 creative project names');
    });

    it('should handle names with numbering prefixes', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('1. phoenix-rise\n2. turbo-boost\n3. bug-squasher\n4. catalyst\n5. merlin\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual([
        'phoenix-rise',
        'turbo-boost',
        'bug-squasher',
        'catalyst',
        'merlin',
      ]);
    });

    it('should handle names with colon prefixes', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('1: phoenix-rise\n2: turbo-boost\n3: bug-squasher\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix-rise', 'turbo-boost', 'bug-squasher']);
    });

    it('should remove duplicate names', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('phoenix\nturbo-boost\nphoenix\ncatalyst\nturbo-boost\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix', 'turbo-boost', 'catalyst']);
    });

    it('should limit to 5 names maximum', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('name-one\nname-two\nname-three\nname-four\nname-five\nname-six\nname-seven\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result.length).toBe(5);
    });

    it('should return 3+ names when available', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('phoenix\nturbo-boost\ncatalyst\n'));

      const result = await generateProjectNames('Some project');

      expect(result.length).toBe(3);
    });

    it('should fall back to single name when Claude fails', async () => {
      mockSpawn.mockReturnValue(createMockSpawn(null, 1));

      const result = await generateProjectNames('Build a user authentication system with OAuth');

      expect(result).toEqual(['build-user-authentication']);
    });

    it('should fall back to single name when too few names returned', async () => {
      mockSpawn.mockReturnValue(createMockSpawn('phoenix\nturbo\n'));

      const result = await generateProjectNames('Build something awesome');

      // Only 2 names returned, so fallback kicks in
      expect(result).toEqual(['build-something-awesome']);
    });

    it('should filter out invalid/short names', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('phoenix\na\nturbo-boost\nb\ncatalyst\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix', 'turbo-boost', 'catalyst']);
    });

    it('should sanitize names with special characters', async () => {
      mockSpawn.mockReturnValue(
        createMockSpawn('Phoenix Rise!\nTurbo-Boost!!!\nBug Squasher\n')
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix-rise', 'turbo-boost', 'bug-squasher']);
    });

    it('should handle empty response', async () => {
      mockSpawn.mockReturnValue(createMockSpawn(''));

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['some-project']);
    });
  });

  describe('sanitizeGeneratedName', () => {
    it('should remove quotes', () => {
      expect(sanitizeGeneratedName('"hello-world"')).toBe('hello-world');
      expect(sanitizeGeneratedName("'hello-world'")).toBe('hello-world');
    });

    it('should remove numbering prefixes', () => {
      expect(sanitizeGeneratedName('1. hello-world')).toBe('hello-world');
      expect(sanitizeGeneratedName('1: hello-world')).toBe('hello-world');
      expect(sanitizeGeneratedName('1) hello-world')).toBe('hello-world');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeGeneratedName('Hello-World')).toBe('hello-world');
    });

    it('should replace special characters with hyphens', () => {
      expect(sanitizeGeneratedName('hello world!')).toBe('hello-world');
    });

    it('should return null for too short names', () => {
      expect(sanitizeGeneratedName('a')).toBeNull();
      expect(sanitizeGeneratedName('')).toBeNull();
    });

    it('should truncate long names', () => {
      const longName = 'a'.repeat(100);
      const result = sanitizeGeneratedName(longName);
      expect(result?.length).toBeLessThanOrEqual(50);
    });
  });
});
