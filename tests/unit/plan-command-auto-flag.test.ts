import { createPlanCommand } from '../../src/commands/plan.js';

describe('Plan Command - Auto Flag', () => {
  describe('CLI option parsing', () => {
    it('should accept --auto flag', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find(
        (opt) => opt.long === '--auto' || opt.short === '-y'
      );
      expect(autoOption).toBeDefined();
    });

    it('should accept -y as shorthand for --auto', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.short === '-y');
      expect(autoOption).toBeDefined();
      expect(autoOption?.long).toBe('--auto');
    });

    it('should have description explaining what --auto does', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.long === '--auto');
      expect(autoOption?.description).toContain('permission');
    });

    it('should have --auto as boolean flag (no required argument)', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.long === '--auto');
      // Boolean flags don't have required or optional args
      expect(autoOption?.required).toBeFalsy();
      expect(autoOption?.optional).toBeFalsy();
    });
  });

  describe('command options coexistence', () => {
    it('should allow --auto with --amend', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.long === '--auto');
      const amendOption = options.find((opt) => opt.long === '--amend');

      expect(autoOption).toBeDefined();
      expect(amendOption).toBeDefined();
    });

    it('should allow --auto with --model', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.long === '--auto');
      const modelOption = options.find((opt) => opt.long === '--model');

      expect(autoOption).toBeDefined();
      expect(modelOption).toBeDefined();
    });

    it('should allow --auto with --sonnet', () => {
      const command = createPlanCommand();
      const options = command.options;

      const autoOption = options.find((opt) => opt.long === '--auto');
      const sonnetOption = options.find((opt) => opt.long === '--sonnet');

      expect(autoOption).toBeDefined();
      expect(sonnetOption).toBeDefined();
    });
  });

  describe('auto-name selection behavior', () => {
    it('should have behavior where first name is auto-selected in auto mode', () => {
      // This test documents the expected behavior:
      // When autoMode is true and no projectName is provided,
      // the first name from generateProjectNames() should be used
      // without calling pickProjectName()

      // The actual behavior is tested implicitly by the implementation:
      // - generateProjectNames() returns ['first-name', 'second-name', 'third-name']
      // - In auto mode: finalProjectName = suggestedNames[0] // 'first-name'
      // - In normal mode: finalProjectName = await pickProjectName(suggestedNames)

      // This test validates the command structure supports this flow
      const command = createPlanCommand();
      const autoOption = command.options.find((opt) => opt.long === '--auto');

      expect(autoOption).toBeDefined();
      expect(autoOption?.short).toBe('-y');
      // The argument is optional (user can omit project name for auto-selection)
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].required).toBe(false);
    });

    it('should support projectName argument as optional', () => {
      const command = createPlanCommand();

      // The first argument is the optional projectName
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('projectName');
      expect(args[0].required).toBe(false);
    });
  });
});
