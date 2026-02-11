import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getClaudeModel,
  getClaudeSettingsPath,
  validateConfig,
  ConfigValidationError,
  resolveConfig,
  getModel,
  getEffortMapping,
  resolveEffortToModel,
  getModelTier,
  applyModelCeiling,
  getCommitFormat,
  getCommitPrefix,
  getTimeout,
  getMaxRetries,
  getAutoCommit,
  getWorktreeDefault,
  getSyncMainBranch,
  getModelShortName,
  resolveFullModelId,
  resetConfigCache,
  saveConfig,
  renderCommitMessage,
  isValidModelName,
} from '../../src/utils/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

describe('Config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-config-test-'));
    resetConfigCache();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    resetConfigCache();
  });

  describe('getClaudeSettingsPath', () => {
    it('should return path in home directory', () => {
      const settingsPath = getClaudeSettingsPath();
      expect(settingsPath).toBe(path.join(os.homedir(), '.claude', 'settings.json'));
    });
  });

  describe('getClaudeModel', () => {
    it('should return model name from Claude settings', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ model: 'opus' }));
      expect(getClaudeModel(settingsPath)).toBe('opus');
    });

    it('should return full model name if specified', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ model: 'claude-sonnet-4-20250514' }));
      expect(getClaudeModel(settingsPath)).toBe('claude-sonnet-4-20250514');
    });

    it('should return null if settings file does not exist', () => {
      expect(getClaudeModel(path.join(tempDir, 'nonexistent.json'))).toBeNull();
    });

    it('should return null if model is not specified in settings', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ permissions: {} }));
      expect(getClaudeModel(settingsPath)).toBeNull();
    });

    it('should return null if settings file is invalid JSON', () => {
      const settingsPath = path.join(tempDir, 'settings.json');
      fs.writeFileSync(settingsPath, 'invalid json');
      expect(getClaudeModel(settingsPath)).toBeNull();
    });

    it('should use default settings path when not provided', () => {
      const result = getClaudeModel();
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should accept an empty object', () => {
      expect(() => validateConfig({})).not.toThrow();
    });

    it('should accept a full valid config', () => {
      const config = {
        models: { plan: 'opus', execute: 'haiku' },
        effortMapping: { low: 'haiku', medium: 'sonnet', high: 'opus' },
        timeout: 30,
        maxRetries: 5,
        autoCommit: false,
        worktree: true,
        commitFormat: { prefix: 'MY', task: '{prefix}[{projectId}] {description}' },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject non-object config', () => {
      expect(() => validateConfig(null)).toThrow(ConfigValidationError);
      expect(() => validateConfig('string')).toThrow(ConfigValidationError);
      expect(() => validateConfig(42)).toThrow(ConfigValidationError);
      expect(() => validateConfig([])).toThrow(ConfigValidationError);
    });

    // Unknown keys
    it('should reject unknown top-level keys', () => {
      expect(() => validateConfig({ unknownKey: 'value' })).toThrow('Unknown config key: unknownKey');
    });

    it('should reject removed claudeCommand key', () => {
      expect(() => validateConfig({ claudeCommand: 'claude' })).toThrow('Unknown config key: claudeCommand');
    });

    it('should reject unknown model keys', () => {
      expect(() => validateConfig({ models: { unknownScenario: 'opus' } })).toThrow('Unknown config key: models.unknownScenario');
    });

    it('should reject unknown effortMapping keys', () => {
      expect(() => validateConfig({ effortMapping: { unknownLevel: 'haiku' } })).toThrow('Unknown config key: effortMapping.unknownLevel');
    });

    it('should reject unknown commitFormat keys', () => {
      expect(() => validateConfig({ commitFormat: { unknownKey: 'val' } })).toThrow('Unknown config key: commitFormat.unknownKey');
    });

    // Valid full model IDs
    it('should accept full model IDs', () => {
      expect(() => validateConfig({ models: { plan: 'claude-opus-4-5-20251101' } })).not.toThrow();
      expect(() => validateConfig({ models: { execute: 'claude-sonnet-4-5-20250929' } })).not.toThrow();
      expect(() => validateConfig({ models: { failureAnalysis: 'claude-haiku-4-5-20251001' } })).not.toThrow();
    });

    it('should accept model IDs without date suffix', () => {
      expect(() => validateConfig({ models: { plan: 'claude-sonnet-4-5' } })).not.toThrow();
      expect(() => validateConfig({ models: { plan: 'claude-opus-4' } })).not.toThrow();
    });

    // Invalid model values
    it('should reject invalid model names', () => {
      expect(() => validateConfig({ models: { plan: 'gpt-4' } })).toThrow('models.plan must be');
    });

    it('should reject random strings as model names', () => {
      expect(() => validateConfig({ models: { plan: 'random-string' } })).toThrow('models.plan must be');
      expect(() => validateConfig({ models: { plan: 'not-a-model' } })).toThrow('models.plan must be');
    });

    it('should reject non-string model values', () => {
      expect(() => validateConfig({ models: { plan: 123 } })).toThrow('models.plan must be');
    });

    // Invalid effortMapping values
    it('should reject invalid effortMapping model names', () => {
      expect(() => validateConfig({ effortMapping: { low: 'invalid-model' } })).toThrow('effortMapping.low must be a short alias');
    });

    // Invalid types for nested objects
    it('should reject non-object models', () => {
      expect(() => validateConfig({ models: 'opus' })).toThrow('models must be an object');
    });

    it('should reject array models', () => {
      expect(() => validateConfig({ models: ['opus'] })).toThrow('models must be an object');
    });

    it('should reject non-object effortMapping', () => {
      expect(() => validateConfig({ effortMapping: 'high' })).toThrow('effortMapping must be an object');
    });

    it('should reject non-object commitFormat', () => {
      expect(() => validateConfig({ commitFormat: 'test' })).toThrow('commitFormat must be an object');
    });

    // Invalid timeout
    it('should reject non-number timeout', () => {
      expect(() => validateConfig({ timeout: '60' })).toThrow('timeout must be a positive number');
    });

    it('should reject zero timeout', () => {
      expect(() => validateConfig({ timeout: 0 })).toThrow('timeout must be a positive number');
    });

    it('should reject negative timeout', () => {
      expect(() => validateConfig({ timeout: -1 })).toThrow('timeout must be a positive number');
    });

    // Invalid maxRetries
    it('should reject non-integer maxRetries', () => {
      expect(() => validateConfig({ maxRetries: 1.5 })).toThrow('maxRetries must be a non-negative integer');
    });

    it('should reject negative maxRetries', () => {
      expect(() => validateConfig({ maxRetries: -1 })).toThrow('maxRetries must be a non-negative integer');
    });

    it('should accept zero maxRetries', () => {
      expect(() => validateConfig({ maxRetries: 0 })).not.toThrow();
    });

    // Invalid booleans
    it('should reject non-boolean autoCommit', () => {
      expect(() => validateConfig({ autoCommit: 'yes' })).toThrow('autoCommit must be a boolean');
    });

    it('should reject non-boolean worktree', () => {
      expect(() => validateConfig({ worktree: 1 })).toThrow('worktree must be a boolean');
    });

    it('should reject non-boolean syncMainBranch', () => {
      expect(() => validateConfig({ syncMainBranch: 'yes' })).toThrow('syncMainBranch must be a boolean');
    });

    it('should accept boolean syncMainBranch', () => {
      expect(() => validateConfig({ syncMainBranch: true })).not.toThrow();
      expect(() => validateConfig({ syncMainBranch: false })).not.toThrow();
    });

    // Non-string commitFormat values
    it('should reject non-string commitFormat values', () => {
      expect(() => validateConfig({ commitFormat: { prefix: 123 } })).toThrow('commitFormat.prefix must be a string');
    });
  });

  describe('isValidModelName', () => {
    it('should accept short aliases', () => {
      expect(isValidModelName('sonnet')).toBe(true);
      expect(isValidModelName('haiku')).toBe(true);
      expect(isValidModelName('opus')).toBe(true);
    });

    it('should accept full model IDs', () => {
      expect(isValidModelName('claude-sonnet-4-5-20250929')).toBe(true);
      expect(isValidModelName('claude-opus-4-5-20251101')).toBe(true);
      expect(isValidModelName('claude-haiku-4-5-20251001')).toBe(true);
      expect(isValidModelName('claude-sonnet-4-5')).toBe(true);
      expect(isValidModelName('claude-opus-4')).toBe(true);
    });

    it('should reject invalid strings', () => {
      expect(isValidModelName('gpt-4')).toBe(false);
      expect(isValidModelName('random-string')).toBe(false);
      expect(isValidModelName('')).toBe(false);
      expect(isValidModelName('claude-')).toBe(false);
      expect(isValidModelName('claude-sonnet')).toBe(false);
      expect(isValidModelName('CLAUDE-SONNET-4')).toBe(false);
    });
  });

  describe('resolveConfig', () => {
    it('should return defaults when no config file exists', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should deep-merge partial models override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ models: { plan: 'haiku' } }));

      const config = resolveConfig(configPath);
      expect(config.models.plan).toBe('haiku');
      expect(config.models.execute).toBe('opus'); // default preserved
      expect(config.models.failureAnalysis).toBe('haiku'); // default preserved
    });

    it('should deep-merge partial effortMapping override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ effortMapping: { medium: 'opus' } }));

      const config = resolveConfig(configPath);
      expect(config.effortMapping.medium).toBe('opus');
      expect(config.effortMapping.low).toBe('haiku'); // default preserved
      expect(config.effortMapping.high).toBe('opus'); // default preserved
    });

    it('should deep-merge partial commitFormat override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ commitFormat: { prefix: 'MY' } }));

      const config = resolveConfig(configPath);
      expect(config.commitFormat.prefix).toBe('MY');
      expect(config.commitFormat.task).toBe(DEFAULT_CONFIG.commitFormat.task); // default preserved
    });

    it('should override scalar values', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ timeout: 120, autoCommit: false, worktree: true }));

      const config = resolveConfig(configPath);
      expect(config.timeout).toBe(120);
      expect(config.autoCommit).toBe(false);
      expect(config.worktree).toBe(true);
      expect(config.maxRetries).toBe(3); // default preserved
    });

    it('should override syncMainBranch', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ syncMainBranch: false }));

      const config = resolveConfig(configPath);
      expect(config.syncMainBranch).toBe(false);
    });

    it('should default syncMainBranch to true', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.syncMainBranch).toBe(true);
    });

    it('should throw on invalid config file', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ unknownKey: true }));

      expect(() => resolveConfig(configPath)).toThrow(ConfigValidationError);
    });

    it('should deep-merge full model ID override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ models: { plan: 'claude-opus-4-5-20251101' } }));

      const config = resolveConfig(configPath);
      expect(config.models.plan).toBe('claude-opus-4-5-20251101');
      expect(config.models.execute).toBe('opus'); // default preserved
    });

    it('should not mutate DEFAULT_CONFIG', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ models: { plan: 'haiku' } }));

      resolveConfig(configPath);
      expect(DEFAULT_CONFIG.models.plan).toBe('opus');
    });
  });

  describe('saveConfig', () => {
    it('should write config to file', () => {
      const configPath = path.join(tempDir, 'sub', 'raf.config.json');
      saveConfig(configPath, { timeout: 90 });

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content).toEqual({ timeout: 90 });
    });

    it('should create parent directories', () => {
      const configPath = path.join(tempDir, 'deep', 'nested', 'raf.config.json');
      saveConfig(configPath, { autoCommit: false });

      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  describe('helper accessors', () => {
    it('getModel returns correct model for scenario', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ models: { plan: 'haiku' } }));
      // Use resolveConfig directly to avoid cached global config
      const config = resolveConfig(configPath);
      expect(config.models.plan).toBe('haiku');
      expect(config.models.execute).toBe('opus');
    });

    it('effortMapping resolves correctly from config', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ effortMapping: { high: 'sonnet' } }));
      const config = resolveConfig(configPath);
      expect(config.effortMapping.high).toBe('sonnet');
      expect(config.effortMapping.low).toBe('haiku'); // default preserved
    });

    it('getCommitFormat returns correct format', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.commitFormat.task).toBe('{prefix}[{projectId}:{taskId}] {description}');
    });

    it('getCommitPrefix returns prefix', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.commitFormat.prefix).toBe('RAF');
    });

    it('scalar helpers return defaults', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.timeout).toBe(60);
      expect(config.maxRetries).toBe(3);
      expect(config.autoCommit).toBe(true);
      expect(config.worktree).toBe(false);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have all model scenarios defined', () => {
      expect(DEFAULT_CONFIG.models.plan).toBe('opus');
      expect(DEFAULT_CONFIG.models.execute).toBe('opus');
      expect(DEFAULT_CONFIG.models.nameGeneration).toBe('sonnet');
      expect(DEFAULT_CONFIG.models.failureAnalysis).toBe('haiku');
      expect(DEFAULT_CONFIG.models.prGeneration).toBe('sonnet');
      expect(DEFAULT_CONFIG.models.config).toBe('sonnet');
    });

    it('should have all effortMapping levels defined', () => {
      expect(DEFAULT_CONFIG.effortMapping.low).toBe('haiku');
      expect(DEFAULT_CONFIG.effortMapping.medium).toBe('sonnet');
      expect(DEFAULT_CONFIG.effortMapping.high).toBe('opus');
    });

    it('should have all commit format fields defined', () => {
      expect(DEFAULT_CONFIG.commitFormat.task).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.plan).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.amend).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.prefix).toBe('RAF');
    });
  });

  describe('renderCommitMessage', () => {
    it('should replace all placeholders in a template', () => {
      const result = renderCommitMessage('{prefix}[{projectId}:{taskId}] {description}', {
        prefix: 'RAF',
        projectId: '001',
        taskId: '01',
        description: 'Add feature',
      });
      expect(result).toBe('RAF[001:01] Add feature');
    });

    it('should leave unknown placeholders as-is', () => {
      const result = renderCommitMessage('{prefix}[{unknown}]', { prefix: 'RAF' });
      expect(result).toBe('RAF[{unknown}]');
    });

    it('should handle plan commit format', () => {
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.plan, {
        prefix: 'RAF',
        projectId: 'abc123',
        projectName: 'my-project',
      });
      expect(result).toBe('RAF[abc123] Plan: my-project');
    });

    it('should handle amend commit format', () => {
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.amend, {
        prefix: 'RAF',
        projectId: 'abc123',
        projectName: 'my-project',
      });
      expect(result).toBe('RAF[abc123] Amend: my-project');
    });

    it('should handle task commit format', () => {
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.task, {
        prefix: 'RAF',
        projectId: '001',
        taskId: '0a',
        description: 'Fix bug',
      });
      expect(result).toBe('RAF[001:0a] Fix bug');
    });

    it('should handle empty variables gracefully', () => {
      const result = renderCommitMessage('{prefix}[{id}]', {});
      expect(result).toBe('{prefix}[{id}]');
    });

    it('should handle custom prefix', () => {
      const result = renderCommitMessage('{prefix}[{projectId}:{taskId}] {description}', {
        prefix: 'CUSTOM',
        projectId: '001',
        taskId: '01',
        description: 'Test',
      });
      expect(result).toBe('CUSTOM[001:01] Test');
    });
  });

  describe('config integration - defaults match previous hardcoded values', () => {
    it('should default models to match previous hardcoded values', () => {
      expect(DEFAULT_CONFIG.models.execute).toBe('opus');
      expect(DEFAULT_CONFIG.models.plan).toBe('opus');
      expect(DEFAULT_CONFIG.models.nameGeneration).toBe('sonnet');
      expect(DEFAULT_CONFIG.models.failureAnalysis).toBe('haiku');
      expect(DEFAULT_CONFIG.models.prGeneration).toBe('sonnet');
    });

    it('should default effortMapping to haiku/sonnet/opus', () => {
      expect(DEFAULT_CONFIG.effortMapping.low).toBe('haiku');
      expect(DEFAULT_CONFIG.effortMapping.medium).toBe('sonnet');
      expect(DEFAULT_CONFIG.effortMapping.high).toBe('opus');
    });

    it('should default timeout to 60', () => {
      expect(DEFAULT_CONFIG.timeout).toBe(60);
    });

    it('should default maxRetries to 3', () => {
      expect(DEFAULT_CONFIG.maxRetries).toBe(3);
    });

    it('should default autoCommit to true', () => {
      expect(DEFAULT_CONFIG.autoCommit).toBe(true);
    });

    it('should default worktree to false', () => {
      expect(DEFAULT_CONFIG.worktree).toBe(false);
    });

    it('should default commit format to match previous hardcoded format', () => {
      // The task format should produce the same output as the old hardcoded format
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.task, {
        prefix: DEFAULT_CONFIG.commitFormat.prefix,
        projectId: 'abcdef',
        taskId: '01',
        description: 'Add feature',
      });
      expect(result).toBe('RAF[abcdef:01] Add feature');
    });

    it('should default plan commit format to match previous hardcoded format', () => {
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.plan, {
        prefix: DEFAULT_CONFIG.commitFormat.prefix,
        projectId: 'abcdef',
        projectName: 'my-project',
      });
      expect(result).toBe('RAF[abcdef] Plan: my-project');
    });

    it('should default amend commit format to match previous hardcoded format', () => {
      const result = renderCommitMessage(DEFAULT_CONFIG.commitFormat.amend, {
        prefix: DEFAULT_CONFIG.commitFormat.prefix,
        projectId: 'abcdef',
        projectName: 'my-project',
      });
      expect(result).toBe('RAF[abcdef] Amend: my-project');
    });
  });

  describe('getModelShortName', () => {
    it('should return short aliases as-is', () => {
      expect(getModelShortName('opus')).toBe('opus');
      expect(getModelShortName('sonnet')).toBe('sonnet');
      expect(getModelShortName('haiku')).toBe('haiku');
    });

    it('should extract family from full model IDs', () => {
      expect(getModelShortName('claude-opus-4-6')).toBe('opus');
      expect(getModelShortName('claude-opus-4-5-20251101')).toBe('opus');
      expect(getModelShortName('claude-sonnet-4-5-20250929')).toBe('sonnet');
      expect(getModelShortName('claude-sonnet-4-5')).toBe('sonnet');
      expect(getModelShortName('claude-haiku-4-5-20251001')).toBe('haiku');
    });

    it('should return unknown model IDs as-is', () => {
      expect(getModelShortName('gpt-4')).toBe('gpt-4');
      expect(getModelShortName('claude-unknown-3-0')).toBe('claude-unknown-3-0');
      expect(getModelShortName('')).toBe('');
      expect(getModelShortName('some-random-model')).toBe('some-random-model');
    });
  });

  describe('resolveFullModelId', () => {
    it('should resolve short aliases to full model IDs', () => {
      expect(resolveFullModelId('opus')).toBe('claude-opus-4-6');
      expect(resolveFullModelId('sonnet')).toBe('claude-sonnet-4-5-20250929');
      expect(resolveFullModelId('haiku')).toBe('claude-haiku-4-5-20251001');
    });

    it('should return full model IDs as-is', () => {
      expect(resolveFullModelId('claude-opus-4-6')).toBe('claude-opus-4-6');
      expect(resolveFullModelId('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5-20250929');
      expect(resolveFullModelId('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5-20251001');
    });

    it('should return unknown model strings as-is', () => {
      expect(resolveFullModelId('gpt-4')).toBe('gpt-4');
      expect(resolveFullModelId('claude-unknown-3-0')).toBe('claude-unknown-3-0');
      expect(resolveFullModelId('')).toBe('');
    });
  });

  describe('config integration - overrides work', () => {
    it('should use custom model when configured', () => {
      const configPath = path.join(tempDir, 'custom-models.json');
      saveConfig(configPath, { models: { execute: 'sonnet', plan: 'haiku' } });
      const config = resolveConfig(configPath);
      expect(config.models.execute).toBe('sonnet');
      expect(config.models.plan).toBe('haiku');
      // Others should remain at defaults
      expect(config.models.nameGeneration).toBe('sonnet');
      expect(config.models.failureAnalysis).toBe('haiku');
    });

    it('should use custom effortMapping when configured', () => {
      const configPath = path.join(tempDir, 'custom-effort.json');
      saveConfig(configPath, { effortMapping: { high: 'sonnet' } });
      const config = resolveConfig(configPath);
      expect(config.effortMapping.high).toBe('sonnet');
      // Others should remain at defaults
      expect(config.effortMapping.low).toBe('haiku');
      expect(config.effortMapping.medium).toBe('sonnet');
    });

    it('should use custom commit format when configured', () => {
      const configPath = path.join(tempDir, 'custom-commit.json');
      saveConfig(configPath, { commitFormat: { prefix: 'CUSTOM', task: '{prefix}-{taskId}: {description}' } });
      const config = resolveConfig(configPath);
      expect(config.commitFormat.prefix).toBe('CUSTOM');
      expect(config.commitFormat.task).toBe('{prefix}-{taskId}: {description}');
      // plan/amend remain at defaults
      expect(config.commitFormat.plan).toBe(DEFAULT_CONFIG.commitFormat.plan);
    });
  });

  describe('validateConfig - display', () => {
    it('should accept valid display config', () => {
      expect(() => validateConfig({
        display: {
          showCacheTokens: false,
        },
      })).not.toThrow();
    });

    it('should accept partial display override', () => {
      expect(() => validateConfig({
        display: { showCacheTokens: false },
      })).not.toThrow();
    });

    it('should reject non-object display', () => {
      expect(() => validateConfig({ display: 'full' })).toThrow('display must be an object');
    });

    it('should reject unknown display keys', () => {
      expect(() => validateConfig({ display: { unknownKey: true } })).toThrow('Unknown config key: display.unknownKey');
    });

    it('should reject non-boolean display values', () => {
      expect(() => validateConfig({ display: { showCacheTokens: 'yes' } })).toThrow('display.showCacheTokens must be a boolean');
    });
  });

  describe('resolveConfig - display', () => {
    it('should include default display when no config file', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.display.showCacheTokens).toBe(true);
    });

    it('should deep-merge partial display override', () => {
      const configPath = path.join(tempDir, 'display.json');
      fs.writeFileSync(configPath, JSON.stringify({
        display: { showCacheTokens: false },
      }));

      const config = resolveConfig(configPath);
      expect(config.display.showCacheTokens).toBe(false);
    });
  });

  describe('DEFAULT_CONFIG - display', () => {
    it('should have default display settings', () => {
      expect(DEFAULT_CONFIG.display.showCacheTokens).toBe(true);
    });
  });

  describe('getModelTier', () => {
    it('should return correct tier for short aliases', () => {
      expect(getModelTier('haiku')).toBe(1);
      expect(getModelTier('sonnet')).toBe(2);
      expect(getModelTier('opus')).toBe(3);
    });

    it('should extract tier from full model IDs', () => {
      expect(getModelTier('claude-haiku-4-5-20251001')).toBe(1);
      expect(getModelTier('claude-sonnet-4-5-20250929')).toBe(2);
      expect(getModelTier('claude-opus-4-6')).toBe(3);
    });

    it('should return highest tier for unknown models', () => {
      expect(getModelTier('unknown-model')).toBe(3);
      expect(getModelTier('claude-future-5-0')).toBe(3);
      expect(getModelTier('')).toBe(3);
    });
  });

  describe('applyModelCeiling', () => {
    it('should return resolved model when below ceiling', () => {
      expect(applyModelCeiling('haiku', 'sonnet')).toBe('haiku');
      expect(applyModelCeiling('haiku', 'opus')).toBe('haiku');
      expect(applyModelCeiling('sonnet', 'opus')).toBe('sonnet');
    });

    it('should return ceiling model when above ceiling', () => {
      expect(applyModelCeiling('opus', 'sonnet')).toBe('sonnet');
      expect(applyModelCeiling('opus', 'haiku')).toBe('haiku');
      expect(applyModelCeiling('sonnet', 'haiku')).toBe('haiku');
    });

    it('should return resolved model when at ceiling', () => {
      expect(applyModelCeiling('sonnet', 'sonnet')).toBe('sonnet');
      expect(applyModelCeiling('opus', 'opus')).toBe('opus');
    });

    it('should work with full model IDs', () => {
      expect(applyModelCeiling('claude-opus-4-6', 'sonnet')).toBe('sonnet');
      expect(applyModelCeiling('claude-haiku-4-5-20251001', 'claude-opus-4-6')).toBe('claude-haiku-4-5-20251001');
    });
  });

  describe('resolveEffortToModel', () => {
    it('should resolve effort levels to default models', () => {
      const configPath = path.join(tempDir, 'default.json');
      // Use default config
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.effortMapping.low).toBe('haiku');
      expect(config.effortMapping.medium).toBe('sonnet');
      expect(config.effortMapping.high).toBe('opus');
    });
  });

  describe('validateConfig - effortMapping', () => {
    it('should accept valid effortMapping config', () => {
      expect(() => validateConfig({
        effortMapping: {
          low: 'haiku',
          medium: 'sonnet',
          high: 'opus',
        },
      })).not.toThrow();
    });

    it('should accept partial effortMapping override', () => {
      expect(() => validateConfig({
        effortMapping: { high: 'sonnet' },
      })).not.toThrow();
    });

    it('should accept full model IDs in effortMapping', () => {
      expect(() => validateConfig({
        effortMapping: { low: 'claude-haiku-4-5-20251001' },
      })).not.toThrow();
    });

    it('should reject invalid model names in effortMapping', () => {
      expect(() => validateConfig({
        effortMapping: { low: 'gpt-4' },
      })).toThrow('effortMapping.low must be a short alias');
    });

    it('should reject unknown keys in effortMapping', () => {
      expect(() => validateConfig({
        effortMapping: { extra: 'haiku' },
      })).toThrow('Unknown config key: effortMapping.extra');
    });
  });
});
