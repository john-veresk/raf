import { jest } from '@jest/globals';

// Mock execSync before importing the module
const mockExecSync = jest.fn();
jest.unstable_mockModule('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Import after mocking
const { generateProjectName } = await import('../../src/utils/name-generator.js');

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
      const longName = 'this-is-a-very-long-project-name-that-exceeds-the-maximum-allowed-length-for-folder-names';
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
});
