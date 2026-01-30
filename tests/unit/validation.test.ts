import {
  validateProjectName,
  sanitizeProjectName,
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
});
