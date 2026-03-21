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

    it('should accept a full valid config with model entries', () => {
      const config = {
        models: {
          plan: { model: 'opus', provider: 'claude' },
          execute: { model: 'haiku', provider: 'claude' },
        },
        effortMapping: {
          low: { model: 'sonnet', provider: 'claude' },
          medium: { model: 'opus', provider: 'claude' },
          high: { model: 'opus', provider: 'claude' },
        },
        timeout: 30,
        maxRetries: 5,
        autoCommit: false,
        worktree: true,
        commitFormat: { prefix: 'MY', task: '{prefix}[{projectId}] {description}' },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should accept mixed-provider model entries', () => {
      const config = {
        models: {
          plan: { model: 'opus', provider: 'claude' },
          execute: { model: 'gpt-5.4', provider: 'codex' },
        },
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should accept model entries with reasoningEffort', () => {
      const config = {
        models: {
          plan: { model: 'opus', provider: 'claude', reasoningEffort: 'high' },
        },
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
      expect(() => validateConfig({ models: { unknownScenario: { model: 'opus', provider: 'claude' } } })).toThrow('Unknown config key: models.unknownScenario');
    });

    it('should reject unknown effortMapping keys', () => {
      expect(() => validateConfig({ effortMapping: { unknownLevel: { model: 'haiku', provider: 'claude' } } })).toThrow('Unknown config key: effortMapping.unknownLevel');
    });

    it('should reject unknown commitFormat keys', () => {
      expect(() => validateConfig({ commitFormat: { unknownKey: 'val' } })).toThrow('Unknown config key: commitFormat.unknownKey');
    });

    // Removed legacy keys
    it('should reject removed provider key with helpful message', () => {
      expect(() => validateConfig({ provider: 'claude' })).toThrow('Top-level "provider" has been removed');
    });

    it('should reject removed codexModels key with helpful message', () => {
      expect(() => validateConfig({ codexModels: { plan: 'gpt-5.4' } })).toThrow('"codexModels" has been removed');
    });

    it('should reject removed codexEffortMapping key with helpful message', () => {
      expect(() => validateConfig({ codexEffortMapping: { low: 'gpt-5.4' } })).toThrow('"codexEffortMapping" has been removed');
    });

    // Model entry validation
    it('should reject string model values (old schema)', () => {
      expect(() => validateConfig({ models: { plan: 'opus' } })).toThrow('must be a model entry object');
    });

    it('should reject model entries missing model field', () => {
      expect(() => validateConfig({ models: { plan: { provider: 'claude' } } })).toThrow('models.plan.model is required');
    });

    it('should reject model entries missing provider field', () => {
      expect(() => validateConfig({ models: { plan: { model: 'opus' } } })).toThrow('models.plan.provider is required');
    });

    it('should reject invalid model names in model entries', () => {
      expect(() => validateConfig({ models: { plan: { model: 'invalid', provider: 'claude' } } })).toThrow('models.plan.model must be a valid model name');
    });

    it('should reject invalid provider in model entries', () => {
      expect(() => validateConfig({ models: { plan: { model: 'opus', provider: 'openai' } } })).toThrow('models.plan.provider must be one of');
    });

    it('should reject invalid reasoningEffort in model entries', () => {
      expect(() => validateConfig({ models: { plan: { model: 'opus', provider: 'claude', reasoningEffort: 'ultra' } } })).toThrow('models.plan.reasoningEffort must be one of');
    });

    it('should reject unknown keys in model entries', () => {
      expect(() => validateConfig({ models: { plan: { model: 'opus', provider: 'claude', unknown: true } } })).toThrow('Unknown config key: models.plan.unknown');
    });

    // Valid full model IDs in entries
    it('should accept full model IDs in entries', () => {
      expect(() => validateConfig({ models: { plan: { model: 'claude-opus-4-5-20251101', provider: 'claude' } } })).not.toThrow();
      expect(() => validateConfig({ models: { execute: { model: 'gpt-5.4', provider: 'codex' } } })).not.toThrow();
    });

    // effortMapping validation
    it('should reject string effortMapping values (old schema)', () => {
      expect(() => validateConfig({ effortMapping: { low: 'sonnet' } })).toThrow('must be a model entry object');
    });

    it('should accept valid effortMapping model entries', () => {
      expect(() => validateConfig({
        effortMapping: {
          low: { model: 'sonnet', provider: 'claude' },
          medium: { model: 'opus', provider: 'claude' },
          high: { model: 'gpt-5.4', provider: 'codex' },
        },
      })).not.toThrow();
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

    it('should accept Codex model names', () => {
      expect(isValidModelName('gpt-5.4')).toBe(true);
      expect(isValidModelName('gpt-5.3-codex')).toBe(true);
      expect(isValidModelName('spark')).toBe(true);
      expect(isValidModelName('codex')).toBe(true);
      expect(isValidModelName('gpt54')).toBe(true);
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
      fs.writeFileSync(configPath, JSON.stringify({
        models: { plan: { model: 'haiku', provider: 'claude' } },
      }));

      const config = resolveConfig(configPath);
      expect(config.models.plan.model).toBe('haiku');
      expect(config.models.plan.provider).toBe('claude');
      expect(config.models.execute.model).toBe('opus'); // default preserved
      expect(config.models.failureAnalysis.model).toBe('haiku'); // default preserved
    });

    it('should deep-merge partial effortMapping override', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        effortMapping: { medium: { model: 'opus', provider: 'claude' } },
      }));

      const config = resolveConfig(configPath);
      expect(config.effortMapping.medium.model).toBe('opus');
      expect(config.effortMapping.low.model).toBe('sonnet'); // default preserved
      expect(config.effortMapping.high.model).toBe('opus'); // default preserved
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

    it('should not mutate DEFAULT_CONFIG', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        models: { plan: { model: 'haiku', provider: 'claude' } },
      }));

      resolveConfig(configPath);
      expect(DEFAULT_CONFIG.models.plan.model).toBe('opus');
    });

    it('should support Codex model entries in config', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        models: {
          execute: { model: 'gpt-5.4', provider: 'codex' },
        },
        effortMapping: {
          high: { model: 'gpt-5.4', provider: 'codex' },
        },
      }));

      const config = resolveConfig(configPath);
      expect(config.models.execute.model).toBe('gpt-5.4');
      expect(config.models.execute.provider).toBe('codex');
      expect(config.effortMapping.high.model).toBe('gpt-5.4');
      expect(config.effortMapping.high.provider).toBe('codex');
      // Claude defaults preserved for unoverridden entries
      expect(config.models.plan.provider).toBe('claude');
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
    it('getModel returns correct model entry for scenario', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        models: { plan: { model: 'haiku', provider: 'claude' } },
      }));
      const config = resolveConfig(configPath);
      expect(config.models.plan.model).toBe('haiku');
      expect(config.models.plan.provider).toBe('claude');
      expect(config.models.execute.model).toBe('opus');
    });

    it('effortMapping resolves correctly from config', () => {
      const configPath = path.join(tempDir, 'raf.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        effortMapping: { high: { model: 'sonnet', provider: 'claude' } },
      }));
      const config = resolveConfig(configPath);
      expect(config.effortMapping.high.model).toBe('sonnet');
      expect(config.effortMapping.low.model).toBe('sonnet'); // default preserved
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
    it('should have all model scenarios defined as ModelEntry objects', () => {
      expect(DEFAULT_CONFIG.models.plan).toEqual({ model: 'opus', provider: 'claude' });
      expect(DEFAULT_CONFIG.models.execute).toEqual({ model: 'opus', provider: 'claude' });
      expect(DEFAULT_CONFIG.models.nameGeneration).toEqual({ model: 'sonnet', provider: 'claude' });
      expect(DEFAULT_CONFIG.models.failureAnalysis).toEqual({ model: 'haiku', provider: 'claude' });
      expect(DEFAULT_CONFIG.models.prGeneration).toEqual({ model: 'sonnet', provider: 'claude' });
      expect(DEFAULT_CONFIG.models.config).toEqual({ model: 'sonnet', provider: 'claude' });
    });

    it('should have all effortMapping levels defined as ModelEntry objects', () => {
      expect(DEFAULT_CONFIG.effortMapping.low).toEqual({ model: 'sonnet', provider: 'claude' });
      expect(DEFAULT_CONFIG.effortMapping.medium).toEqual({ model: 'opus', provider: 'claude' });
      expect(DEFAULT_CONFIG.effortMapping.high).toEqual({ model: 'opus', provider: 'claude' });
    });

    it('should have all commit format fields defined', () => {
      expect(DEFAULT_CONFIG.commitFormat.task).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.plan).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.amend).toContain('{prefix}');
      expect(DEFAULT_CONFIG.commitFormat.prefix).toBe('RAF');
    });

    it('should not have provider, codexModels, or codexEffortMapping fields', () => {
      expect('provider' in DEFAULT_CONFIG).toBe(false);
      expect('codexModels' in DEFAULT_CONFIG).toBe(false);
      expect('codexEffortMapping' in DEFAULT_CONFIG).toBe(false);
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
        taskId: '10',
        description: 'Fix bug',
      });
      expect(result).toBe('RAF[001:10] Fix bug');
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

    it('should return correct tiers for Codex models', () => {
      expect(getModelTier('spark')).toBe(1);
      expect(getModelTier('codex')).toBe(1);
      expect(getModelTier('gpt-5.3-codex')).toBe(1);
      expect(getModelTier('gpt54')).toBe(2);
      expect(getModelTier('gpt-5.4')).toBe(2);
    });

    it('should return highest tier for unknown models', () => {
      expect(getModelTier('unknown-model')).toBe(3);
      expect(getModelTier('claude-future-5-0')).toBe(3);
      expect(getModelTier('')).toBe(3);
    });
  });

  describe('applyModelCeiling', () => {
    it('should return resolved entry when below ceiling', () => {
      const resolved = { model: 'haiku', provider: 'claude' as const };
      const ceiling = { model: 'sonnet', provider: 'claude' as const };
      expect(applyModelCeiling(resolved, ceiling)).toEqual(resolved);
    });

    it('should return ceiling entry when above ceiling', () => {
      const resolved = { model: 'opus', provider: 'claude' as const };
      const ceiling = { model: 'sonnet', provider: 'claude' as const };
      expect(applyModelCeiling(resolved, ceiling)).toEqual(ceiling);
    });

    it('should return resolved entry when at ceiling', () => {
      const resolved = { model: 'sonnet', provider: 'claude' as const };
      const ceiling = { model: 'sonnet', provider: 'claude' as const };
      expect(applyModelCeiling(resolved, ceiling)).toEqual(resolved);
    });

    it('should work with full model IDs', () => {
      const resolved = { model: 'claude-opus-4-6', provider: 'claude' as const };
      const ceiling = { model: 'sonnet', provider: 'claude' as const };
      expect(applyModelCeiling(resolved, ceiling)).toEqual(ceiling);
    });
  });

  describe('resolveEffortToModel', () => {
    it('should resolve effort levels to default model entries', () => {
      const config = resolveConfig(path.join(tempDir, 'nonexistent.json'));
      expect(config.effortMapping.low).toEqual({ model: 'sonnet', provider: 'claude' });
      expect(config.effortMapping.medium).toEqual({ model: 'opus', provider: 'claude' });
      expect(config.effortMapping.high).toEqual({ model: 'opus', provider: 'claude' });
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

  describe('new schema - provider-aware resolution', () => {
    it('should allow mixing Claude and Codex entries across scenarios', () => {
      const configPath = path.join(tempDir, 'mixed.json');
      fs.writeFileSync(configPath, JSON.stringify({
        models: {
          plan: { model: 'opus', provider: 'claude' },
          execute: { model: 'gpt-5.4', provider: 'codex' },
          nameGeneration: { model: 'sonnet', provider: 'claude' },
        },
      }));

      const config = resolveConfig(configPath);
      expect(config.models.plan.provider).toBe('claude');
      expect(config.models.execute.provider).toBe('codex');
      expect(config.models.nameGeneration.provider).toBe('claude');
    });

    it('should allow mixing providers in effortMapping', () => {
      const configPath = path.join(tempDir, 'mixed-effort.json');
      fs.writeFileSync(configPath, JSON.stringify({
        effortMapping: {
          low: { model: 'sonnet', provider: 'claude' },
          high: { model: 'gpt-5.4', provider: 'codex' },
        },
      }));

      const config = resolveConfig(configPath);
      expect(config.effortMapping.low.provider).toBe('claude');
      expect(config.effortMapping.high.provider).toBe('codex');
      // Medium preserved from defaults
      expect(config.effortMapping.medium.provider).toBe('claude');
    });
  });
});
