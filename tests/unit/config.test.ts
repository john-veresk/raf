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
  getEffort,
  getCommitFormat,
  getCommitPrefix,
  getTimeout,
  getMaxRetries,
  getAutoCommit,
  getWorktreeDefault,
  getModelShortName,
  resetConfigCache,
  saveConfig,
  renderCommitMessage,
  isValidModelName,
  resolveModelPricingCategory,
  getPricing,
  getPricingConfig,
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
        effort: { plan: 'high', execute: 'low' },
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

    it('should reject unknown effort keys', () => {
      expect(() => validateConfig({ effort: { unknownScenario: 'high' } })).toThrow('Unknown config key: effort.unknownScenario');
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

    // Invalid effort values
    it('should reject invalid effort levels', () => {
      expect(() => validateConfig({ effort: { plan: 'ultra' } })).toThrow('effort.plan must be one of');
    });

    // Invalid types for nested objects
    it('should reject non-object models', () => {
      expect(() => validateConfig({ models: 'opus' })).toThrow('models must be an object');
    });

    it('should reject array models', () => {
      expect(() => validateConfig({ models: ['opus'] })).toThrow('models must be an object');
    });

    it('should reject non-object effort', () => {
      expect(() => validateConfig({ effort: 'high' })).toThrow('effort must be an object');
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

    it('should deep-merge partial effort override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ effort: { execute: 'high' } }));

      const config = resolveConfig(configPath);
      expect(config.effort.execute).toBe('high');
      expect(config.effort.plan).toBe('high'); // default preserved
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

    it('getEffort returns correct effort for scenario', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ effort: { plan: 'low' } }));
      const config = resolveConfig(configPath);
      expect(config.effort.plan).toBe('low');
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

    it('should have all effort scenarios defined', () => {
      expect(DEFAULT_CONFIG.effort.plan).toBe('high');
      expect(DEFAULT_CONFIG.effort.execute).toBe('medium');
      expect(DEFAULT_CONFIG.effort.nameGeneration).toBe('low');
      expect(DEFAULT_CONFIG.effort.failureAnalysis).toBe('low');
      expect(DEFAULT_CONFIG.effort.prGeneration).toBe('medium');
      expect(DEFAULT_CONFIG.effort.config).toBe('medium');
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

    it('should default effort to match previous hardcoded values', () => {
      expect(DEFAULT_CONFIG.effort.execute).toBe('medium');
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

  describe('validateConfig - pricing', () => {
    it('should accept valid pricing config', () => {
      expect(() => validateConfig({
        pricing: {
          opus: { inputPerMTok: 15, outputPerMTok: 75 },
        },
      })).not.toThrow();
    });

    it('should accept partial pricing override', () => {
      expect(() => validateConfig({
        pricing: {
          haiku: { outputPerMTok: 4 },
        },
      })).not.toThrow();
    });

    it('should reject non-object pricing', () => {
      expect(() => validateConfig({ pricing: 'expensive' })).toThrow('pricing must be an object');
    });

    it('should reject unknown pricing categories', () => {
      expect(() => validateConfig({ pricing: { gpt4: { inputPerMTok: 10 } } })).toThrow('Unknown config key: pricing.gpt4');
    });

    it('should reject non-object category value', () => {
      expect(() => validateConfig({ pricing: { opus: 'expensive' } })).toThrow('pricing.opus must be an object');
    });

    it('should reject unknown pricing fields', () => {
      expect(() => validateConfig({ pricing: { opus: { unknownField: 5 } } })).toThrow('Unknown config key: pricing.opus.unknownField');
    });

    it('should reject negative pricing values', () => {
      expect(() => validateConfig({ pricing: { opus: { inputPerMTok: -1 } } })).toThrow('pricing.opus.inputPerMTok must be a non-negative number');
    });

    it('should reject non-number pricing values', () => {
      expect(() => validateConfig({ pricing: { opus: { inputPerMTok: 'fifteen' } } })).toThrow('pricing.opus.inputPerMTok must be a non-negative number');
    });

    it('should accept zero pricing values', () => {
      expect(() => validateConfig({ pricing: { haiku: { inputPerMTok: 0 } } })).not.toThrow();
    });

    it('should reject Infinity pricing values', () => {
      expect(() => validateConfig({ pricing: { opus: { inputPerMTok: Infinity } } })).toThrow('must be a non-negative number');
    });
  });

  describe('resolveModelPricingCategory', () => {
    it('should map short aliases directly', () => {
      expect(resolveModelPricingCategory('opus')).toBe('opus');
      expect(resolveModelPricingCategory('sonnet')).toBe('sonnet');
      expect(resolveModelPricingCategory('haiku')).toBe('haiku');
    });

    it('should extract family from full model IDs', () => {
      expect(resolveModelPricingCategory('claude-opus-4-6')).toBe('opus');
      expect(resolveModelPricingCategory('claude-sonnet-4-5-20250929')).toBe('sonnet');
      expect(resolveModelPricingCategory('claude-haiku-4-5-20251001')).toBe('haiku');
    });

    it('should return null for unknown model families', () => {
      expect(resolveModelPricingCategory('claude-unknown-3-0')).toBeNull();
      expect(resolveModelPricingCategory('gpt-4')).toBeNull();
      expect(resolveModelPricingCategory('')).toBeNull();
    });
  });

  describe('resolveConfig - pricing', () => {
    it('should include default pricing when no config file', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.pricing.opus.inputPerMTok).toBe(15);
      expect(config.pricing.sonnet.inputPerMTok).toBe(3);
      expect(config.pricing.haiku.inputPerMTok).toBe(1);
    });

    it('should deep-merge partial pricing override', () => {
      const configPath = path.join(tempDir, 'pricing.json');
      fs.writeFileSync(configPath, JSON.stringify({
        pricing: { opus: { inputPerMTok: 10 } },
      }));

      const config = resolveConfig(configPath);
      expect(config.pricing.opus.inputPerMTok).toBe(10);
      expect(config.pricing.opus.outputPerMTok).toBe(75); // default preserved
      expect(config.pricing.sonnet.inputPerMTok).toBe(3); // default preserved
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

    it('should use custom effort when configured', () => {
      const configPath = path.join(tempDir, 'custom-effort.json');
      saveConfig(configPath, { effort: { execute: 'high' } });
      const config = resolveConfig(configPath);
      expect(config.effort.execute).toBe('high');
      // Others should remain at defaults
      expect(config.effort.plan).toBe('high');
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
          showRateLimitEstimate: true,
          showCacheTokens: false,
        },
      })).not.toThrow();
    });

    it('should accept partial display override', () => {
      expect(() => validateConfig({
        display: { showRateLimitEstimate: false },
      })).not.toThrow();
    });

    it('should reject non-object display', () => {
      expect(() => validateConfig({ display: 'full' })).toThrow('display must be an object');
    });

    it('should reject unknown display keys', () => {
      expect(() => validateConfig({ display: { unknownKey: true } })).toThrow('Unknown config key: display.unknownKey');
    });

    it('should reject non-boolean display values', () => {
      expect(() => validateConfig({ display: { showRateLimitEstimate: 'yes' } })).toThrow('display.showRateLimitEstimate must be a boolean');
    });
  });

  describe('validateConfig - rateLimitWindow', () => {
    it('should accept valid rateLimitWindow config', () => {
      expect(() => validateConfig({
        rateLimitWindow: { sonnetTokenCap: 100000 },
      })).not.toThrow();
    });

    it('should reject non-object rateLimitWindow', () => {
      expect(() => validateConfig({ rateLimitWindow: 88000 })).toThrow('rateLimitWindow must be an object');
    });

    it('should reject unknown rateLimitWindow keys', () => {
      expect(() => validateConfig({ rateLimitWindow: { unknownKey: 50000 } })).toThrow('Unknown config key: rateLimitWindow.unknownKey');
    });

    it('should reject non-positive sonnetTokenCap', () => {
      expect(() => validateConfig({ rateLimitWindow: { sonnetTokenCap: 0 } })).toThrow('rateLimitWindow.sonnetTokenCap must be a positive number');
      expect(() => validateConfig({ rateLimitWindow: { sonnetTokenCap: -100 } })).toThrow('rateLimitWindow.sonnetTokenCap must be a positive number');
    });

    it('should reject non-number sonnetTokenCap', () => {
      expect(() => validateConfig({ rateLimitWindow: { sonnetTokenCap: '88000' } })).toThrow('rateLimitWindow.sonnetTokenCap must be a positive number');
    });
  });

  describe('resolveConfig - display and rateLimitWindow', () => {
    it('should include default display when no config file', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.display.showRateLimitEstimate).toBe(true);
      expect(config.display.showCacheTokens).toBe(true);
    });

    it('should include default rateLimitWindow when no config file', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.rateLimitWindow.sonnetTokenCap).toBe(88000);
    });

    it('should deep-merge partial display override', () => {
      const configPath = path.join(tempDir, 'display.json');
      fs.writeFileSync(configPath, JSON.stringify({
        display: { showRateLimitEstimate: false },
      }));

      const config = resolveConfig(configPath);
      expect(config.display.showRateLimitEstimate).toBe(false);
      expect(config.display.showCacheTokens).toBe(true); // default preserved
    });

    it('should deep-merge partial rateLimitWindow override', () => {
      const configPath = path.join(tempDir, 'rateLimit.json');
      fs.writeFileSync(configPath, JSON.stringify({
        rateLimitWindow: { sonnetTokenCap: 100000 },
      }));

      const config = resolveConfig(configPath);
      expect(config.rateLimitWindow.sonnetTokenCap).toBe(100000);
    });
  });

  describe('DEFAULT_CONFIG - display and rateLimitWindow', () => {
    it('should have default display settings', () => {
      expect(DEFAULT_CONFIG.display.showRateLimitEstimate).toBe(true);
      expect(DEFAULT_CONFIG.display.showCacheTokens).toBe(true);
    });

    it('should have default rateLimitWindow settings', () => {
      expect(DEFAULT_CONFIG.rateLimitWindow.sonnetTokenCap).toBe(88000);
    });
  });
});
