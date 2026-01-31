import { jest } from '@jest/globals';

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Import after mocking
const { generateProjectName, generateProjectNames, sanitizeGeneratedName, escapeShellArg } =
  await import('../../src/utils/name-generator.js');

describe('Name Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProjectName', () => {
    it('should return sanitized name from Sonnet response', async () => {
      mockExecSync.mockReturnValue('user-auth-system\n');

      const result = await generateProjectName('Build a user authentication system');

      expect(result).toBe('user-auth-system');
      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('claude --model sonnet --print'),
        expect.any(Object)
      );
    });

    it('should sanitize Sonnet response with quotes', async () => {
      mockExecSync.mockReturnValue('"api-rate-limiter"');

      const result = await generateProjectName('Create an API rate limiting service');

      expect(result).toBe('api-rate-limiter');
    });

    it('should sanitize Sonnet response with special characters', async () => {
      mockExecSync.mockReturnValue('Some Project! Name');

      const result = await generateProjectName('Some project description');

      expect(result).toBe('some-project-name');
    });

    it('should fall back to word extraction when Sonnet fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await generateProjectName('Build a user authentication system with OAuth');

      expect(result).toBe('build-user-authentication');
    });

    it('should fall back to word extraction when Sonnet returns empty', async () => {
      mockExecSync.mockReturnValue('');

      const result = await generateProjectName('Implement caching layer for database');

      expect(result).toBe('implement-caching-layer');
    });

    it('should fall back to word extraction when Sonnet returns single char', async () => {
      mockExecSync.mockReturnValue('a');

      const result = await generateProjectName('Add new logging functionality');

      expect(result).toBe('add-new-logging');
    });

    it('should return "project" when description has no meaningful words', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await generateProjectName('a b c');

      expect(result).toBe('project');
    });

    it('should truncate long names from Sonnet', async () => {
      const longName =
        'this-is-a-very-long-project-name-that-exceeds-the-maximum-allowed-length-for-folder-names';
      mockExecSync.mockReturnValue(longName);

      const result = await generateProjectName('Some project');

      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle multiline Sonnet response', async () => {
      mockExecSync.mockReturnValue('project-name\nSome extra explanation\n');

      const result = await generateProjectName('Some project');

      // Should take first line after trim
      expect(result).toBe('project-name-some-extra-explanation');
    });

    it('should convert uppercase to lowercase', async () => {
      mockExecSync.mockReturnValue('API-Gateway-Service');

      const result = await generateProjectName('Build an API gateway');

      expect(result).toBe('api-gateway-service');
    });
  });

  describe('generateProjectNames', () => {
    it('should return multiple sanitized names from Sonnet response', async () => {
      mockExecSync.mockReturnValue(
        'phoenix-rise\nturbo-boost\nbug-squasher\ncatalyst\nmerlin\n'
      );

      const result = await generateProjectNames('Build a user authentication system');

      expect(result).toEqual([
        'phoenix-rise',
        'turbo-boost',
        'bug-squasher',
        'catalyst',
        'merlin',
      ]);
      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('Generate 5 creative project names'),
        expect.any(Object)
      );
    });

    it('should handle names with numbering prefixes', async () => {
      mockExecSync.mockReturnValue(
        '1. phoenix-rise\n2. turbo-boost\n3. bug-squasher\n4. catalyst\n5. merlin\n'
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
      mockExecSync.mockReturnValue(
        '1: phoenix-rise\n2: turbo-boost\n3: bug-squasher\n'
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix-rise', 'turbo-boost', 'bug-squasher']);
    });

    it('should remove duplicate names', async () => {
      mockExecSync.mockReturnValue(
        'phoenix\nturbo-boost\nphoenix\ncatalyst\nturbo-boost\n'
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix', 'turbo-boost', 'catalyst']);
    });

    it('should limit to 5 names maximum', async () => {
      mockExecSync.mockReturnValue(
        'name-one\nname-two\nname-three\nname-four\nname-five\nname-six\nname-seven\n'
      );

      const result = await generateProjectNames('Some project');

      expect(result.length).toBe(5);
    });

    it('should return 3+ names when available', async () => {
      mockExecSync.mockReturnValue('phoenix\nturbo-boost\ncatalyst\n');

      const result = await generateProjectNames('Some project');

      expect(result.length).toBe(3);
    });

    it('should fall back to single name when Sonnet fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = await generateProjectNames('Build a user authentication system with OAuth');

      expect(result).toEqual(['build-user-authentication']);
    });

    it('should fall back to single name when too few names returned', async () => {
      mockExecSync.mockReturnValue('phoenix\nturbo\n');

      const result = await generateProjectNames('Build something awesome');

      // Only 2 names returned, so fallback kicks in
      expect(result).toEqual(['build-something-awesome']);
    });

    it('should filter out invalid/short names', async () => {
      mockExecSync.mockReturnValue('phoenix\na\nturbo-boost\nb\ncatalyst\n');

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix', 'turbo-boost', 'catalyst']);
    });

    it('should sanitize names with special characters', async () => {
      mockExecSync.mockReturnValue(
        'Phoenix Rise!\nTurbo-Boost!!!\nBug Squasher\n'
      );

      const result = await generateProjectNames('Some project');

      expect(result).toEqual(['phoenix-rise', 'turbo-boost', 'bug-squasher']);
    });

    it('should handle empty response', async () => {
      mockExecSync.mockReturnValue('');

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

  describe('escapeShellArg', () => {
    it('should escape double quotes', () => {
      expect(escapeShellArg('hello "world"')).toBe('hello \\"world\\"');
    });

    it('should escape backslashes', () => {
      expect(escapeShellArg('hello\\world')).toBe('hello\\\\world');
    });

    it('should escape dollar signs', () => {
      expect(escapeShellArg('$HOME')).toBe('\\$HOME');
    });

    it('should escape backticks', () => {
      expect(escapeShellArg('`whoami`')).toBe('\\`whoami\\`');
    });
  });
});
