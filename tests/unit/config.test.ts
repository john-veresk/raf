import { jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getClaudeModel, getClaudeSettingsPath } from '../../src/utils/config.js';

describe('Config', () => {
  describe('getClaudeSettingsPath', () => {
    it('should return path in home directory', () => {
      const settingsPath = getClaudeSettingsPath();
      expect(settingsPath).toBe(path.join(os.homedir(), '.claude', 'settings.json'));
    });
  });

  describe('getClaudeModel', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-config-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return model name from Claude settings', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ model: 'opus' }));

      const result = getClaudeModel(settingsPath);
      expect(result).toBe('opus');
    });

    it('should return full model name if specified', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ model: 'claude-sonnet-4-20250514' }));

      const result = getClaudeModel(settingsPath);
      expect(result).toBe('claude-sonnet-4-20250514');
    });

    it('should return null if settings file does not exist', () => {
      const settingsPath = path.join(tempDir, 'nonexistent.json');

      const result = getClaudeModel(settingsPath);
      expect(result).toBeNull();
    });

    it('should return null if model is not specified in settings', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ permissions: {} }));

      const result = getClaudeModel(settingsPath);
      expect(result).toBeNull();
    });

    it('should return null if settings file is invalid JSON', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, 'invalid json');

      const result = getClaudeModel(settingsPath);
      expect(result).toBeNull();
    });

    it('should use default settings path when not provided', () => {
      // This tests the default path behavior - the actual file may or may not exist
      const result = getClaudeModel();
      // Just verify it doesn't throw and returns string or null
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
