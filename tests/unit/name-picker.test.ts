import { jest } from '@jest/globals';

// Mock @inquirer/prompts before importing the module
const mockSelect = jest.fn();
const mockInput = jest.fn();
jest.unstable_mockModule('@inquirer/prompts', () => ({
  select: mockSelect,
  input: mockInput,
}));

// Import after mocking
const { pickProjectName, enableDirectMode, disableDirectMode } = await import(
  '../../src/ui/name-picker.js'
);

describe('Name Picker', () => {
  beforeAll(async () => {
    // Enable direct mode for testing (bypasses subprocess)
    await enableDirectMode();
  });

  afterAll(() => {
    disableDirectMode();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pickProjectName', () => {
    it('should display generated names as choices', async () => {
      mockSelect.mockResolvedValue('phoenix-rise');

      const result = await pickProjectName(['phoenix-rise', 'turbo-boost', 'catalyst']);

      expect(result).toBe('phoenix-rise');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project name:',
        choices: [
          { name: 'phoenix-rise', value: 'phoenix-rise' },
          { name: 'turbo-boost', value: 'turbo-boost' },
          { name: 'catalyst', value: 'catalyst' },
          { name: 'Other (enter custom name)', value: '__OTHER__' },
        ],
      });
    });

    it('should return selected name from list', async () => {
      mockSelect.mockResolvedValue('turbo-boost');

      const result = await pickProjectName(['phoenix', 'turbo-boost', 'merlin']);

      expect(result).toBe('turbo-boost');
    });

    it('should prompt for custom name when "Other" is selected', async () => {
      mockSelect.mockResolvedValue('__OTHER__');
      mockInput.mockResolvedValue('custom-project');

      const result = await pickProjectName(['phoenix', 'turbo']);

      expect(result).toBe('custom-project');
      expect(mockInput).toHaveBeenCalledTimes(1);
      expect(mockInput).toHaveBeenCalledWith({
        message: 'Enter project name:',
        validate: expect.any(Function),
      });
    });

    it('should prompt for custom name immediately when names array is empty', async () => {
      mockInput.mockResolvedValue('my-project');

      const result = await pickProjectName([]);

      expect(result).toBe('my-project');
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockInput).toHaveBeenCalledTimes(1);
    });

    it('should convert custom name to lowercase', async () => {
      mockSelect.mockResolvedValue('__OTHER__');
      mockInput.mockResolvedValue('MyProject');

      const result = await pickProjectName(['phoenix']);

      expect(result).toBe('myproject');
    });

    it('should trim custom name', async () => {
      mockSelect.mockResolvedValue('__OTHER__');
      mockInput.mockResolvedValue('  my-project  ');

      const result = await pickProjectName(['phoenix']);

      expect(result).toBe('my-project');
    });

    describe('custom name validation', () => {
      let validateFn: (value: string) => boolean | string;

      beforeEach(async () => {
        mockSelect.mockResolvedValue('__OTHER__');
        mockInput.mockImplementation(async (config) => {
          validateFn = config.validate;
          return 'valid-name';
        });

        await pickProjectName(['phoenix']);
      });

      it('should reject empty names', () => {
        expect(validateFn('')).toBe('Project name cannot be empty');
        expect(validateFn('   ')).toBe('Project name cannot be empty');
      });

      it('should reject names longer than 50 characters', () => {
        const longName = 'a'.repeat(51);
        expect(validateFn(longName)).toBe('Project name must be 50 characters or less');
      });

      it('should accept valid names', () => {
        expect(validateFn('valid-name')).toBe(true);
        expect(validateFn('my_project')).toBe(true);
        expect(validateFn('project123')).toBe(true);
      });

      it('should reject names with special characters', () => {
        expect(validateFn('hello world')).toBe(
          'Project name can only contain letters, numbers, hyphens, and underscores'
        );
        expect(validateFn('project!')).toBe(
          'Project name can only contain letters, numbers, hyphens, and underscores'
        );
      });

      it('should reject names starting with hyphen', () => {
        expect(validateFn('-project')).toBe(
          'Project name can only contain letters, numbers, hyphens, and underscores'
        );
      });
    });

    it('should handle 5 generated names', async () => {
      const names = ['name-one', 'name-two', 'name-three', 'name-four', 'name-five'];
      mockSelect.mockResolvedValue('name-three');

      const result = await pickProjectName(names);

      expect(result).toBe('name-three');
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project name:',
        choices: [
          { name: 'name-one', value: 'name-one' },
          { name: 'name-two', value: 'name-two' },
          { name: 'name-three', value: 'name-three' },
          { name: 'name-four', value: 'name-four' },
          { name: 'name-five', value: 'name-five' },
          { name: 'Other (enter custom name)', value: '__OTHER__' },
        ],
      });
    });

    it('should handle single generated name', async () => {
      mockSelect.mockResolvedValue('only-option');

      const result = await pickProjectName(['only-option']);

      expect(result).toBe('only-option');
      expect(mockSelect).toHaveBeenCalledWith({
        message: 'Select a project name:',
        choices: [
          { name: 'only-option', value: 'only-option' },
          { name: 'Other (enter custom name)', value: '__OTHER__' },
        ],
      });
    });
  });
});
