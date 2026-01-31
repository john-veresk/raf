import { select, input } from '@inquirer/prompts';

const OTHER_OPTION_VALUE = '__OTHER__';

/**
 * Display an interactive name picker with arrow-key navigation.
 * Allows user to select from generated names or enter a custom name.
 *
 * @param names - Array of generated name suggestions (3-5 names)
 * @returns The selected or custom project name
 */
export async function pickProjectName(names: string[]): Promise<string> {
  if (names.length === 0) {
    // No names provided, go straight to custom input
    return promptForCustomName();
  }

  // Build choices array with generated names + "Other" option
  const choices = [
    ...names.map((name) => ({
      name: name,
      value: name,
    })),
    {
      name: 'Other (enter custom name)',
      value: OTHER_OPTION_VALUE,
    },
  ];

  const selected = await select({
    message: 'Select a project name:',
    choices,
  });

  if (selected === OTHER_OPTION_VALUE) {
    return promptForCustomName();
  }

  return selected;
}

/**
 * Prompt user to enter a custom project name.
 */
async function promptForCustomName(): Promise<string> {
  const customName = await input({
    message: 'Enter project name:',
    validate: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Project name cannot be empty';
      }
      if (trimmed.length > 50) {
        return 'Project name must be 50 characters or less';
      }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(trimmed)) {
        return 'Project name can only contain letters, numbers, hyphens, and underscores';
      }
      return true;
    },
  });

  return customName.trim().toLowerCase();
}
