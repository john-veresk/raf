import { createPlanCommand } from '../../src/commands/plan.js';

describe('Plan Command - Amend Flag Position', () => {
  describe('CLI option parsing', () => {
    it('should accept --amend flag', () => {
      const command = createPlanCommand();
      const options = command.options;

      const amendOption = options.find(
        (opt) => opt.long === '--amend' || opt.short === '-a'
      );
      expect(amendOption).toBeDefined();
    });

    it('should accept -a as shorthand for --amend', () => {
      const command = createPlanCommand();
      const options = command.options;

      const amendOption = options.find((opt) => opt.short === '-a');
      expect(amendOption).toBeDefined();
      expect(amendOption?.long).toBe('--amend');
    });

    it('should have description explaining what --amend does', () => {
      const command = createPlanCommand();
      const options = command.options;

      const amendOption = options.find((opt) => opt.long === '--amend');
      expect(amendOption?.description).toContain('existing project');
    });

    it('should have --amend as boolean flag (no required argument)', () => {
      const command = createPlanCommand();
      const options = command.options;

      const amendOption = options.find((opt) => opt.long === '--amend');
      // Boolean flags don't have required or optional args
      expect(amendOption?.required).toBeFalsy();
      expect(amendOption?.optional).toBeFalsy();
    });
  });

  describe('positional argument usage', () => {
    it('should have projectName as optional positional argument', () => {
      const command = createPlanCommand();
      // Commander stores arguments in _args array
      const args = command.registeredArguments;

      expect(args.length).toBeGreaterThanOrEqual(1);
      expect(args[0].name()).toBe('projectName');
      expect(args[0].required).toBe(false); // optional
    });

    it('should allow positional argument with --amend flag', () => {
      const command = createPlanCommand();
      const options = command.options;
      const args = command.registeredArguments;

      // Both positional argument and --amend flag should be present
      const amendOption = options.find((opt) => opt.long === '--amend');
      expect(amendOption).toBeDefined();
      expect(args.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('command syntax variants', () => {
    // These tests verify that both syntaxes are structurally supported
    // Note: Actual command execution is tested in integration tests

    it('should support "raf plan myproject --amend" syntax structurally', () => {
      const command = createPlanCommand();

      // Verify both positional arg and boolean flag exist
      const args = command.registeredArguments;
      const options = command.options;
      const amendOption = options.find((opt) => opt.long === '--amend');

      // Positional argument for project name
      expect(args[0].name()).toBe('projectName');
      // Boolean flag (no required argument)
      expect(amendOption?.required).toBeFalsy();
    });

    it('should support "raf plan --amend myproject" syntax structurally', () => {
      const command = createPlanCommand();

      // In Commander.js, --flag <arg> consumes the next argument
      // With boolean flag, positional args are separate
      const args = command.registeredArguments;
      const options = command.options;
      const amendOption = options.find((opt) => opt.long === '--amend');

      // Boolean flag allows positional arg to be used separately
      expect(amendOption?.required).toBeFalsy();
      expect(amendOption?.optional).toBeFalsy();
      expect(args[0].name()).toBe('projectName');
    });
  });

  describe('flag type change verification', () => {
    it('should not require an argument value for --amend', () => {
      const command = createPlanCommand();
      const options = command.options;
      const amendOption = options.find((opt) => opt.long === '--amend');

      // Verify it's a boolean flag, not a value-taking option
      // In Commander.js:
      // - required: true means <value> is required
      // - optional: true means [value] is optional
      // - both false means boolean flag
      expect(amendOption?.required).toBe(false);
      expect(amendOption?.optional).toBe(false);
    });
  });
});
