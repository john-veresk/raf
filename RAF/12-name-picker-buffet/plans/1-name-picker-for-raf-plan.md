# Task: Name Picker for `raf plan`

## Objective
Generate 3-5 project name suggestions using Claude Sonnet and let the user pick one via arrow-key navigation or provide a custom name.

## Context
Currently `raf plan` requires a project name upfront. This task adds intelligent name generation when no name is provided, making project creation faster and more creative.

## Requirements
- Generate 3-5 project names with varied styles (fun, metaphor, descriptive, somewhat-related-and-fun)
- Use Claude Sonnet for name generation (more capable for creative tasks)
- Pass the project description (input.md content) as context for relevant suggestions
- When project has many unrelated tasks, prefer abstract/metaphorical/fun names over descriptive ones
- Use `@inquirer/prompts` for arrow-key selection UI
- Include "Other (enter custom name)" option that triggers text input
- Names should be kebab-case and suitable for folder names

## Implementation Steps
1. Add `@inquirer/prompts` as a dependency if not already present
2. Create a new module `src/core/name-generator.ts`:
   - `generateProjectNames(description: string): Promise<string[]>` - calls Claude Sonnet API
   - Include prompt instructions for variety in naming styles
3. Create a new module `src/ui/name-picker.ts`:
   - `pickProjectName(names: string[]): Promise<string>` - shows arrow-key list with custom option
   - Handle "Other" selection by showing text input prompt
4. Update `src/commands/plan.ts`:
   - Check if name is provided in `raf plan [name]`
   - If not, read input.md content
   - Call name generator with description
   - Show name picker UI
   - Continue with selected/custom name
5. Add unit tests for name generator (mock Claude API)
6. Add unit tests for name picker UI (mock inquirer)

## Acceptance Criteria
- [ ] Running `raf plan` without a name shows 3-5 generated names
- [ ] Names have variety in style (not all the same pattern)
- [ ] User can select with arrow keys and Enter
- [ ] User can choose "Other" and type custom name
- [ ] Selected name is used for project folder creation
- [ ] All tests pass

## Notes
- Use Claude Sonnet (not Haiku) for better creative output
- Ensure names are valid for file system (no special chars, kebab-case)
- The name generator should be fast - consider streaming or timeout
- Include prompt instruction: if the project has many unrelated tasks (detected by diverse/disconnected topics in description), prefer more abstract, metaphorical, or fun names rather than trying to be descriptive about all tasks
