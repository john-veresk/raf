#!/usr/bin/env node
/**
 * Subprocess script for running the name picker.
 * This isolates @inquirer/prompts from the main process to prevent
 * stdin corruption that affects subsequent node-pty usage.
 *
 * Usage: node name-picker-subprocess.js <json-encoded-names-array> <output-file>
 * Output: Selected name written to output file
 */

import { select, input } from '@inquirer/prompts';
import * as fs from 'node:fs';

const OTHER_OPTION_VALUE = '__OTHER__';

async function main(): Promise<void> {
  // Get names from command line argument
  const namesJson = process.argv[2];
  const outputFile = process.argv[3];

  if (!namesJson || !outputFile) {
    console.error('Usage: name-picker-subprocess <json-encoded-names-array> <output-file>');
    process.exit(1);
  }

  let names: string[];
  try {
    names = JSON.parse(namesJson);
  } catch {
    console.error('Invalid JSON input');
    process.exit(1);
  }

  const result = await pickProjectName(names);

  // Write result to output file
  fs.writeFileSync(outputFile, result, 'utf-8');
}

async function pickProjectName(names: string[]): Promise<string> {
  if (names.length === 0) {
    return promptForCustomName();
  }

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

main().catch((error) => {
  // Check if user cancelled with Ctrl+C
  if (error.message?.includes('User force closed') || error.name === 'ExitPromptError') {
    process.exit(130); // Standard SIGINT exit code
  }
  console.error('Error:', error.message);
  process.exit(1);
});
