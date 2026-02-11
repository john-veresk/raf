import { parsePlanFrontmatter } from '../../src/utils/frontmatter.js';

describe('parsePlanFrontmatter', () => {
  describe('standard format (---/---)', () => {
    it('should parse effort field', () => {
      const content = `---
effort: medium
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('medium');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse model field', () => {
      const content = `---
model: sonnet
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.model).toBe('sonnet');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse both effort and model', () => {
      const content = `---
effort: high
model: opus
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('high');
      expect(result.frontmatter.model).toBe('opus');
    });

    it('should handle empty frontmatter block', () => {
      const content = `---
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
    });

    it('should handle whitespace before opening delimiter', () => {
      const content = `
---
effort: low
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('low');
    });

    it('should handle empty lines in frontmatter', () => {
      const content = `---
effort: low

model: haiku
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('low');
      expect(result.frontmatter.model).toBe('haiku');
    });

    it('should handle opening delimiter with trailing spaces', () => {
      const content = `---
effort: medium
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('medium');
    });

    it('should return empty for missing closing delimiter', () => {
      const content = `---
effort: medium
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
    });

    it('should return empty for opening delimiter without newline', () => {
      const content = `---effort: medium
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
    });
  });

  describe('legacy format (closing --- only)', () => {
    it('should parse effort field', () => {
      const content = `effort: medium
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('medium');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse model field', () => {
      const content = `model: sonnet
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.model).toBe('sonnet');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse both effort and model', () => {
      const content = `effort: high
model: opus
---
# Task: Test Task`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('high');
      expect(result.frontmatter.model).toBe('opus');
    });

    it('should accept all effort levels', () => {
      for (const level of ['low', 'medium', 'high']) {
        const content = `effort: ${level}
---
# Task: Test`;
        const result = parsePlanFrontmatter(content);
        expect(result.hasFrontmatter).toBe(true);
        expect(result.frontmatter.effort).toBe(level);
      }
    });

    it('should accept full model IDs', () => {
      const content = `model: claude-opus-4-6
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.model).toBe('claude-opus-4-6');
    });

    it('should be case-insensitive for effort values', () => {
      const content = `effort: MEDIUM
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('medium');
    });

    it('should handle empty lines in frontmatter', () => {
      const content = `effort: low

model: haiku
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('low');
      expect(result.frontmatter.model).toBe('haiku');
    });
  });

  describe('no frontmatter', () => {
    it('should return empty for content without delimiter', () => {
      const content = `# Task: Test Task

## Objective
Do something`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
      expect(result.frontmatter.effort).toBeUndefined();
      expect(result.frontmatter.model).toBeUndefined();
    });

    it('should return empty for empty content', () => {
      const result = parsePlanFrontmatter('');
      expect(result.hasFrontmatter).toBe(false);
    });

    it('should return empty when markdown heading appears before delimiter', () => {
      const content = `# Task: Test Task
---
More content`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
      expect(result.warnings).toContain('Frontmatter section contains markdown content before closing delimiter');
    });
  });

  describe('warnings', () => {
    it('should warn on unknown frontmatter keys', () => {
      const content = `effort: medium
unknownKey: value
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.warnings).toContain('Unknown frontmatter key: "unknownkey"');
    });

    it('should warn on invalid effort value', () => {
      const content = `effort: invalid
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false); // No valid frontmatter extracted
      expect(result.warnings.some(w => w.includes('Invalid effort value'))).toBe(true);
    });

    it('should warn on invalid model value', () => {
      const content = `model: gpt-4
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(false);
      expect(result.warnings.some(w => w.includes('Invalid model value'))).toBe(true);
    });

    it('should collect multiple warnings', () => {
      const content = `effort: invalid
model: gpt-4
unknownKey: value
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle delimiter with content after it', () => {
      const content = `effort: medium
---
# Task: Test

## Objective
Do something

---

More content with another delimiter`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('medium');
    });

    it('should handle whitespace around values', () => {
      const content = `effort:   high
model:  sonnet
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('high');
      expect(result.frontmatter.model).toBe('sonnet');
    });

    it('should handle tabs in whitespace', () => {
      const content = `effort:\thigh
---
# Task: Test`;
      const result = parsePlanFrontmatter(content);
      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter.effort).toBe('high');
    });
  });
});
