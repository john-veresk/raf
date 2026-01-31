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
});
