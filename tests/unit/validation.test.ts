import {
  validateProjectName,
  sanitizeProjectName,
  validateModelName,
  resolveModelOption,
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

    it('should reject invalid model names', () => {
      expect(validateModelName('gpt4')).toBeNull();
      expect(validateModelName('claude')).toBeNull();
      expect(validateModelName('')).toBeNull();
      expect(validateModelName('invalid')).toBeNull();
    });
  });

  describe('resolveModelOption', () => {
    it('should return a valid model as default', () => {
      // Default comes from config, could be short alias or full model ID
      const result = resolveModelOption();
      expect(result).toMatch(/^(opus|sonnet|haiku|claude-(opus|sonnet|haiku)-.+)$/);
      expect(resolveModelOption(undefined, undefined)).toBe(result);
      expect(resolveModelOption(undefined, false)).toBe(result);
    });

    it('should use --model flag when provided', () => {
      expect(resolveModelOption('sonnet')).toBe('sonnet');
      expect(resolveModelOption('haiku')).toBe('haiku');
      expect(resolveModelOption('opus')).toBe('opus');
    });

    it('should normalize model name to lowercase', () => {
      expect(resolveModelOption('SONNET')).toBe('sonnet');
      expect(resolveModelOption('Haiku')).toBe('haiku');
    });

    it('should use --sonnet shorthand', () => {
      expect(resolveModelOption(undefined, true)).toBe('sonnet');
    });

    it('should throw error for conflicting flags', () => {
      expect(() => resolveModelOption('haiku', true)).toThrow(
        'Cannot specify both --model and --sonnet flags'
      );
      expect(() => resolveModelOption('opus', true)).toThrow(
        'Cannot specify both --model and --sonnet flags'
      );
    });

    it('should throw error for invalid model name', () => {
      expect(() => resolveModelOption('gpt4')).toThrow(
        'Invalid model name: "gpt4". Valid options: sonnet, haiku, opus'
      );
      expect(() => resolveModelOption('invalid')).toThrow(
        'Invalid model name: "invalid". Valid options: sonnet, haiku, opus'
      );
    });
  });
});
