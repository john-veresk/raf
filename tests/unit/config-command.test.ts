import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { jest } from '@jest/globals';

const mockRunInteractive = jest.fn<() => Promise<number>>();
const mockCreateRunner = jest.fn(() => ({
  runInteractive: mockRunInteractive,
}));
const mockShutdownHandler = {
  init: jest.fn(),
  registerClaudeRunner: jest.fn(),
};
const mockLogger = {
  info: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  newline: jest.fn(),
};

let confirmAnswer = 'y';
const suiteHomeDir = fs.mkdtempSync(path.join('/tmp', 'raf-config-home-'));
let mockHomeDir = suiteHomeDir;

jest.unstable_mockModule('node:os', () => ({
  homedir: () => mockHomeDir,
  tmpdir: () => '/tmp',
}));

jest.unstable_mockModule('../../src/core/runner-factory.js', () => ({
  createRunner: mockCreateRunner,
}));

jest.unstable_mockModule('../../src/core/shutdown-handler.js', () => ({
  shutdownHandler: mockShutdownHandler,
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

jest.unstable_mockModule('node:readline', () => ({
  createInterface: jest.fn(() => ({
    question: (_message: string, callback: (answer: string) => void) => callback(confirmAnswer),
    close: jest.fn(),
  })),
}));

const { createConfigCommand } = await import('../../src/commands/config.js');
const { resetConfigCache, resolveConfig, validateConfig, ConfigValidationError } = await import('../../src/utils/config.js');
const { DEFAULT_CONFIG } = await import('../../src/types/config.js');

describe('Config Command', () => {
  let tempDir: string;

  function configPath(): string {
    return path.join(tempDir, '.raf', 'raf.config.json');
  }

  async function parseConfigCommand(args: string[]): Promise<void> {
    const command = createConfigCommand();
    command.exitOverride();
    await command.parseAsync(args, { from: 'user' });
  }

  beforeEach(() => {
    tempDir = suiteHomeDir;
    mockHomeDir = suiteHomeDir;
    fs.rmSync(path.join(tempDir, '.raf'), { recursive: true, force: true });
    confirmAnswer = 'y';
    resetConfigCache();
    mockRunInteractive.mockReset().mockResolvedValue(0);
    mockCreateRunner.mockClear();
    mockShutdownHandler.init.mockClear();
    mockShutdownHandler.registerClaudeRunner.mockClear();
    mockLogger.info.mockClear();
    mockLogger.success.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.newline.mockClear();
  });

  afterEach(() => {
    fs.rmSync(path.join(tempDir, '.raf'), { recursive: true, force: true });
    resetConfigCache();
  });

  afterAll(() => {
    fs.rmSync(suiteHomeDir, { recursive: true, force: true });
  });

  describe('Command setup', () => {
    it('should create a command named "config"', () => {
      const cmd = createConfigCommand();
      expect(cmd.name()).toBe('config');
    });

    it('should expose get, set, reset, wizard, and preset subcommands', () => {
      const cmd = createConfigCommand();
      expect(cmd.commands.map((subcommand) => subcommand.name())).toEqual(['get', 'set', 'reset', 'wizard', 'preset']);
    });

    it('should not keep the old root-level flags or prompt argument', () => {
      const cmd = createConfigCommand();
      expect(cmd.options).toHaveLength(0);
      expect(cmd.registeredArguments).toHaveLength(0);
    });

    it('should define wizard with a variadic prompt argument', () => {
      const cmd = createConfigCommand();
      const wizard = cmd.commands.find((subcommand) => subcommand.name() === 'wizard');
      expect(wizard).toBeDefined();
      expect(wizard!.registeredArguments).toHaveLength(1);
      expect(wizard!.registeredArguments[0]!.variadic).toBe(true);
    });

    it('should register in a parent program', () => {
      const program = new Command();
      program.addCommand(createConfigCommand());
      const configCmd = program.commands.find((command) => command.name() === 'config');
      expect(configCmd).toBeDefined();
      expect(program.commands.find((command) => command.name() === 'preset')).toBeUndefined();
    });

    it('should nest preset save/load/list/delete under config', () => {
      const cmd = createConfigCommand();
      const preset = cmd.commands.find((subcommand) => subcommand.name() === 'preset');
      expect(preset).toBeDefined();
      expect(preset!.commands.map((subcommand) => subcommand.name())).toEqual(['save', 'load', 'list', 'delete']);
    });
  });

  describe('config get', () => {
    it('prints the resolved config when no key is provided', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify({ timeout: 120 }, null, 2));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await parseConfigCommand(['get']);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const printed = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
      expect(printed.timeout).toBe(120);
      expect(printed.models.execute).toEqual(DEFAULT_CONFIG.models.execute);

      consoleSpy.mockRestore();
    });

    it('prints a resolved dot-notation value', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify({ models: { plan: { model: 'haiku', harness: 'claude' } } }, null, 2));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await parseConfigCommand(['get', 'models.plan.model']);

      expect(consoleSpy).toHaveBeenCalledWith('haiku');
      consoleSpy.mockRestore();
    });
  });

  describe('config set', () => {
    it('writes values with the existing parsing and validation behavior', async () => {
      await parseConfigCommand(['set', 'timeout', '45']);

      const saved = JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
      expect(saved).toEqual({ timeout: 45 });
      expect(resolveConfig(configPath()).timeout).toBe(45);
    });

    it('prunes the config file when a value is reset to its default', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify({ timeout: 45 }, null, 2));

      await parseConfigCommand(['set', 'timeout', String(DEFAULT_CONFIG.timeout)]);

      expect(fs.existsSync(configPath())).toBe(false);
    });

    it('writes codex.executionMode for codex task execution policy', async () => {
      await parseConfigCommand(['set', 'codex.executionMode', 'fullAuto']);

      const saved = JSON.parse(fs.readFileSync(configPath(), 'utf-8'));
      expect(saved).toEqual({ codex: { executionMode: 'fullAuto' } });
      expect(resolveConfig(configPath()).codex.executionMode).toBe('fullAuto');
    });
  });

  describe('config reset', () => {
    it('deletes the config file after confirmation', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify({ timeout: 45 }, null, 2));

      await parseConfigCommand(['reset']);

      expect(fs.existsSync(configPath())).toBe(false);
    });

    it('keeps the config file when confirmation is declined', async () => {
      confirmAnswer = 'n';
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), JSON.stringify({ timeout: 45 }, null, 2));

      await parseConfigCommand(['reset']);

      expect(fs.existsSync(configPath())).toBe(true);
    });
  });

  describe('config wizard', () => {
    it('launches the interactive session only from the wizard subcommand', async () => {
      await parseConfigCommand(['wizard', 'show', 'my', 'config']);

      expect(mockCreateRunner).toHaveBeenCalledWith(expect.objectContaining(DEFAULT_CONFIG.models.config));
      expect(mockRunInteractive).toHaveBeenCalledWith(
        expect.any(String),
        'show my config',
        { dangerouslySkipPermissions: true }
      );
    });

    it('preserves broken-config recovery behavior and updated guidance', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(configPath(), '{ "timeout": 45, }');

      await parseConfigCommand(['wizard']);

      expect(mockCreateRunner).toHaveBeenCalledWith(expect.objectContaining(DEFAULT_CONFIG.models.config));
      expect(mockRunInteractive).toHaveBeenCalledWith(
        expect.stringContaining('{ "timeout": 45, }'),
        'Show me my current config and help me make changes.',
        { dangerouslySkipPermissions: true }
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('raf config reset'));
    });

    it('does not launch the interactive session from bare config', async () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      await parseConfigCommand([]);

      expect(mockRunInteractive).not.toHaveBeenCalled();
      expect(stdoutSpy).toHaveBeenCalled();
      const helpOutput = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('');
      expect(helpOutput).toContain('wizard');
      expect(helpOutput).toContain('get');
      expect(helpOutput).toContain('preset');

      stdoutSpy.mockRestore();
    });
  });

  describe('config preset', () => {
    it('saves, lists, loads, and deletes presets with the nested command', async () => {
      fs.mkdirSync(path.dirname(configPath()), { recursive: true });
      fs.writeFileSync(
        configPath(),
        JSON.stringify({ timeout: 45, models: { execute: { model: 'sonnet', harness: 'claude' } } }, null, 2)
      );

      await parseConfigCommand(['preset', 'save', 'team-default']);

      const presetPath = path.join(tempDir, '.raf', 'presets', 'team-default.json');
      expect(fs.existsSync(presetPath)).toBe(true);
      expect(JSON.parse(fs.readFileSync(presetPath, 'utf-8'))).toEqual(
        JSON.parse(fs.readFileSync(configPath(), 'utf-8'))
      );

      await parseConfigCommand(['preset', 'list']);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('team-default'));

      fs.writeFileSync(configPath(), JSON.stringify({ timeout: 5 }, null, 2));

      await parseConfigCommand(['preset', 'load', 'team-default']);
      expect(JSON.parse(fs.readFileSync(configPath(), 'utf-8'))).toEqual(
        JSON.parse(fs.readFileSync(presetPath, 'utf-8'))
      );

      await parseConfigCommand(['preset', 'delete', 'team-default']);
      expect(fs.existsSync(presetPath)).toBe(false);
    });

    it('uses updated guidance in preset runtime messages', async () => {
      await parseConfigCommand(['preset', 'list']);
      expect(mockLogger.info).toHaveBeenCalledWith('No presets saved. Use `raf config preset save <name>` to create one.');

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit');
      }) as typeof process.exit);

      await expect(parseConfigCommand(['preset', 'load', 'missing'])).rejects.toThrow('process.exit');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Preset "missing" not found. Run `raf config preset list` to see available presets.'
      );

      exitSpy.mockRestore();
    });
  });

  describe('Validation helpers used by config flows', () => {
    it('accepts valid partial configs', () => {
      expect(() => validateConfig({ models: { execute: { model: 'sonnet', harness: 'claude' } } })).not.toThrow();
      expect(() => validateConfig({ effortMapping: { low: { model: 'sonnet', harness: 'claude' } } })).not.toThrow();
      expect(() => validateConfig({ timeout: 120 })).not.toThrow();
    });

    it('rejects invalid configs', () => {
      expect(() => validateConfig({ unknownKey: true })).toThrow(ConfigValidationError);
      expect(() => validateConfig({ models: { execute: { model: 'gpt-4', harness: 'codex' } } })).toThrow(ConfigValidationError);
      expect(() => validateConfig('string')).toThrow(ConfigValidationError);
    });
  });
});
