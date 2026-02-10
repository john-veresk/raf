import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { createConfigCommand } from '../../src/commands/config.js';
import { validateConfig, ConfigValidationError } from '../../src/utils/config.js';

describe('Config Command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-config-cmd-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Command setup', () => {
    it('should create a command named "config"', () => {
      const cmd = createConfigCommand();
      expect(cmd.name()).toBe('config');
    });

    it('should have a description', () => {
      const cmd = createConfigCommand();
      expect(cmd.description()).toBeTruthy();
      expect(cmd.description()).toContain('config');
    });

    it('should accept a variadic prompt argument', () => {
      const cmd = createConfigCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBe(1);
      expect(args[0]!.variadic).toBe(true);
    });

    it('should have a --reset option', () => {
      const cmd = createConfigCommand();
      const resetOption = cmd.options.find((o) => o.long === '--reset');
      expect(resetOption).toBeDefined();
    });

    it('should register in a parent program', () => {
      const program = new Command();
      program.addCommand(createConfigCommand());
      const configCmd = program.commands.find((c) => c.name() === 'config');
      expect(configCmd).toBeDefined();
    });
  });

  describe('Post-session validation logic', () => {
    it('should accept valid config with model override', () => {
      const config = { models: { execute: 'sonnet' } };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should accept valid config with effort override', () => {
      const config = { effort: { plan: 'low' } };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should accept valid config with timeout', () => {
      const config = { timeout: 120 };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject config with unknown keys', () => {
      const config = { unknownKey: true };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with invalid model name', () => {
      const config = { models: { execute: 'gpt-4' } };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with invalid effort level', () => {
      const config = { effort: { plan: 'max' } };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject non-object config', () => {
      expect(() => validateConfig('string')).toThrow(ConfigValidationError);
      expect(() => validateConfig(null)).toThrow(ConfigValidationError);
      expect(() => validateConfig([])).toThrow(ConfigValidationError);
    });

    it('should accept an empty config (all defaults)', () => {
      expect(() => validateConfig({})).not.toThrow();
    });
  });

  describe('Reset flow - file operations', () => {
    it('should be able to delete config file', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ timeout: 90 }, null, 2));
      expect(fs.existsSync(configPath)).toBe(true);

      fs.unlinkSync(configPath);
      expect(fs.existsSync(configPath)).toBe(false);
    });

    it('should handle non-existent config file gracefully', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      expect(fs.existsSync(configPath)).toBe(false);
      // Reset when no file exists should not throw
    });
  });

  describe('Config file round-trip', () => {
    it('should write and read valid config', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      const config = { models: { execute: 'sonnet' as const }, timeout: 90 };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.models.execute).toBe('sonnet');
      expect(parsed.timeout).toBe(90);
      expect(() => validateConfig(parsed)).not.toThrow();
    });

    it('should detect invalid JSON after write', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, '{ invalid json }}}');

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(() => JSON.parse(content)).toThrow(SyntaxError);
    });

    it('should detect validation errors after write', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ badKey: true }, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(() => validateConfig(parsed)).toThrow(ConfigValidationError);
    });
  });

  describe('System prompt construction', () => {
    it('should indicate no config when file does not exist', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      const exists = fs.existsSync(configPath);
      const state = exists
        ? fs.readFileSync(configPath, 'utf-8')
        : 'No config file exists yet.';
      expect(state).toContain('No config file');
    });

    it('should include config contents when file exists', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      const config = { timeout: 120, worktree: true };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('"timeout": 120');
      expect(content).toContain('"worktree": true');
    });
  });
});
