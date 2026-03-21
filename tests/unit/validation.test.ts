import {
  validateProjectName,
  sanitizeProjectName,
  validateModelName,
} from '../../src/utils/validation.js';

describe('Validation', () => {
  describe('validateProjectName', () => {
    it('should accept valid names', () => {
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('project123')).toBe(true);
      expect(validateProjectName('my_project')).toBe(true);
      expect(validateProjectName('MyProject')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(validateProjectName('')).toBe(false);
      expect(validateProjectName('-starts-with-dash')).toBe(false);
      expect(validateProjectName('has spaces')).toBe(false);
      expect(validateProjectName('special!chars')).toBe(false);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(51);
      expect(validateProjectName(longName)).toBe(false);

      const maxName = 'a'.repeat(50);
      expect(validateProjectName(maxName)).toBe(true);
    });
  });

  describe('sanitizeProjectName', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeProjectName('MyProject')).toBe('myproject');
    });

    it('should replace spaces and special chars with hyphens', () => {
      expect(sanitizeProjectName('My Project Name')).toBe('my-project-name');
      expect(sanitizeProjectName('project!@#name')).toBe('project-name');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeProjectName('---project---')).toBe('project');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeProjectName('my   project')).toBe('my-project');
    });

    it('should truncate long names', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeProjectName(longName).length).toBe(50);
    });
  });

  describe('validateModelName', () => {
    it('should accept valid model names', () => {
      expect(validateModelName('sonnet')).toBe('sonnet');
      expect(validateModelName('haiku')).toBe('haiku');
      expect(validateModelName('opus')).toBe('opus');
    });

    it('should normalize to lowercase', () => {
      expect(validateModelName('SONNET')).toBe('sonnet');
      expect(validateModelName('Haiku')).toBe('haiku');
      expect(validateModelName('OPUS')).toBe('opus');
    });

    it('should accept Codex model names', () => {
      expect(validateModelName('gpt-5.4')).toBe('gpt-5.4');
      expect(validateModelName('gpt54')).toBe('gpt54');
    });

    it('should reject invalid model names', () => {
      expect(validateModelName('gpt4')).toBeNull();
      expect(validateModelName('claude')).toBeNull();
      expect(validateModelName('')).toBeNull();
      expect(validateModelName('invalid')).toBeNull();
    });
  });

  describe('resolveModelOption removed', () => {
    it('should not be exported from validation module', async () => {
      const validationModule = await import('../../src/utils/validation.js');
      expect('resolveModelOption' in validationModule).toBe(false);
    });
  });
});
