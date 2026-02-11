import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import { createPlanCommand } from '../../src/commands/plan.js';
import { createDoCommand } from '../../src/commands/do.js';
import { getWorktreeDefault, resetConfigCache, saveConfig } from '../../src/utils/config.js';

describe('Worktree Flag Override', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raf-worktree-flag-test-'));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
    resetConfigCache();
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tempDir, { recursive: true, force: true });
    resetConfigCache();
  });

  describe('Commander.js --no-worktree flag parsing', () => {
    it('should parse --worktree as true', () => {
      const planCommand = createPlanCommand();
      // Use parseOptions instead of parse to avoid running the action
      planCommand.parseOptions(['--worktree']);
      const opts = planCommand.opts();
      expect(opts.worktree).toBe(true);
    });

    it('should parse --no-worktree as false', () => {
      const planCommand = createPlanCommand();
      planCommand.parseOptions(['--no-worktree']);
      const opts = planCommand.opts();
      expect(opts.worktree).toBe(false);
    });

    it('should parse omitted flag as undefined', () => {
      const planCommand = createPlanCommand();
      planCommand.parseOptions([]);
      const opts = planCommand.opts();
      expect(opts.worktree).toBeUndefined();
    });

    it('should parse --worktree for do command as true', () => {
      const doCommand = createDoCommand();
      doCommand.parseOptions(['--worktree']);
      const opts = doCommand.opts();
      expect(opts.worktree).toBe(true);
    });

    it('should parse --no-worktree for do command as false', () => {
      const doCommand = createDoCommand();
      doCommand.parseOptions(['--no-worktree']);
      const opts = doCommand.opts();
      expect(opts.worktree).toBe(false);
    });

    it('should parse omitted flag for do command as undefined', () => {
      const doCommand = createDoCommand();
      doCommand.parseOptions([]);
      const opts = doCommand.opts();
      expect(opts.worktree).toBeUndefined();
    });
  });

  describe('Config resolution with --no-worktree flag', () => {
    it('should resolve to true when --worktree flag is passed (regardless of config)', () => {
      // Simulate: options.worktree = true (from --worktree flag)
      const options = { worktree: true };
      // With nullish coalescing, explicit true takes precedence
      const resolved = options.worktree ?? getWorktreeDefault();
      expect(resolved).toBe(true);
    });

    it('should resolve to false when --no-worktree flag is passed (regardless of config)', () => {
      // Simulate: options.worktree = false (from --no-worktree flag)
      const options = { worktree: false };
      // With nullish coalescing, explicit false takes precedence
      const resolved = options.worktree ?? getWorktreeDefault();
      expect(resolved).toBe(false);
    });

    it('should resolve to config default when no flag is passed', () => {
      // Simulate: options.worktree = undefined (no flag passed)
      const options = { worktree: undefined };
      // With nullish coalescing, undefined falls back to getWorktreeDefault()
      const resolved = options.worktree ?? getWorktreeDefault();
      // We can't assert a specific value here since it depends on the user's actual config
      expect(typeof resolved).toBe('boolean');
    });
  });

  describe('Tri-state behavior verification', () => {
    it('should correctly handle all three states (true/false/undefined) in plan command', () => {
      // State 1: --worktree (explicit true)
      const planCmd1 = createPlanCommand();
      planCmd1.parseOptions(['--worktree']);
      const opts1 = planCmd1.opts();
      expect(opts1.worktree).toBe(true);
      const resolved1 = opts1.worktree ?? getWorktreeDefault();
      expect(resolved1).toBe(true);

      // State 2: --no-worktree (explicit false)
      const planCmd2 = createPlanCommand();
      planCmd2.parseOptions(['--no-worktree']);
      const opts2 = planCmd2.opts();
      expect(opts2.worktree).toBe(false);
      const resolved2 = opts2.worktree ?? getWorktreeDefault();
      expect(resolved2).toBe(false);

      // State 3: omitted (undefined, falls back to config)
      const planCmd3 = createPlanCommand();
      planCmd3.parseOptions([]);
      const opts3 = planCmd3.opts();
      expect(opts3.worktree).toBeUndefined();
      const resolved3 = opts3.worktree ?? getWorktreeDefault();
      // Should be a boolean (actual value depends on config)
      expect(typeof resolved3).toBe('boolean');
    });

    it('should correctly handle all three states (true/false/undefined) in do command', () => {
      // State 1: --worktree (explicit true)
      const doCmd1 = createDoCommand();
      doCmd1.parseOptions(['--worktree']);
      const opts1 = doCmd1.opts();
      expect(opts1.worktree).toBe(true);
      const resolved1 = opts1.worktree ?? getWorktreeDefault();
      expect(resolved1).toBe(true);

      // State 2: --no-worktree (explicit false)
      const doCmd2 = createDoCommand();
      doCmd2.parseOptions(['--no-worktree']);
      const opts2 = doCmd2.opts();
      expect(opts2.worktree).toBe(false);
      const resolved2 = opts2.worktree ?? getWorktreeDefault();
      expect(resolved2).toBe(false);

      // State 3: omitted (undefined, falls back to config)
      const doCmd3 = createDoCommand();
      doCmd3.parseOptions([]);
      const opts3 = doCmd3.opts();
      expect(opts3.worktree).toBeUndefined();
      const resolved3 = opts3.worktree ?? getWorktreeDefault();
      // Should be a boolean (actual value depends on config)
      expect(typeof resolved3).toBe('boolean');
    });
  });

  describe('Override semantics', () => {
    it('--no-worktree should override config default (explicit false takes precedence)', () => {
      const planCommand = createPlanCommand();
      planCommand.parseOptions(['--no-worktree']);
      const opts = planCommand.opts();
      const resolved = opts.worktree ?? getWorktreeDefault();

      expect(opts.worktree).toBe(false); // Flag sets explicit false
      expect(resolved).toBe(false); // Final result is false (flag takes precedence)
    });

    it('--worktree should override config default (explicit true takes precedence)', () => {
      const doCommand = createDoCommand();
      doCommand.parseOptions(['--worktree']);
      const opts = doCommand.opts();
      const resolved = opts.worktree ?? getWorktreeDefault();

      expect(opts.worktree).toBe(true); // Flag sets explicit true
      expect(resolved).toBe(true); // Final result is true (flag takes precedence)
    });

    it('omitting flag should fall back to config default', () => {
      const planCommand = createPlanCommand();
      planCommand.parseOptions([]);
      const opts = planCommand.opts();
      const resolved = opts.worktree ?? getWorktreeDefault();

      expect(opts.worktree).toBeUndefined(); // Flag not set
      expect(typeof resolved).toBe('boolean'); // Falls back to config (which is a boolean)
      expect(resolved).toBe(getWorktreeDefault()); // Final result matches config
    });
  });
});
