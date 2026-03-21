# Task: Improve Haiku Prompt for Project Naming

## Objective
Update the Claude Haiku prompt for project name generation to focus on the core feature and let Haiku decide the most important task.

## Context
Currently, the Haiku prompt in `src/utils/name-generator.ts` simply says "Generate a short kebab-case project name (2-4 words) for this project description". The user wants improved guidance so that:
1. Haiku analyzes the project description to identify the most important/impactful task
2. The name focuses on the core functionality being built
3. Names are action-oriented and descriptive

## Requirements
- Update the Haiku prompt to include instructions for:
  - Analyzing the project description to find the most important task
  - Focusing on the core feature/functionality
  - Creating action-oriented names that describe what the project does
- Keep the existing constraints: kebab-case, 2-4 words, 50 char max
- Maintain fallback behavior if Haiku fails
- User-provided names via CLI should still skip Haiku entirely (existing behavior)

## Implementation Steps
1. Read `src/utils/name-generator.ts` to understand current implementation
2. Update the prompt string passed to Haiku with improved instructions:
   ```
   Analyze this project description and generate a short kebab-case name (2-4 words).
   Focus on the most important or core feature being built.
   The name should be action-oriented, describing what the project does.
   Examples: 'add-user-auth', 'fix-payment-flow', 'refactor-api-routes'

   Project description:
   {description}
   ```
3. Test the new prompt with various project descriptions
4. Ensure the sanitization and fallback logic still works
5. Update any tests related to name generation

## Acceptance Criteria
- [ ] Haiku prompt includes instruction to identify most important task
- [ ] Haiku prompt includes instruction to focus on core feature
- [ ] Haiku prompt guides toward action-oriented naming
- [ ] Generated names are descriptive of project functionality
- [ ] Existing fallback behavior (if Haiku fails) still works
- [ ] CLI-provided names still bypass Haiku
- [ ] All tests pass

## Notes
- The prompt should not be too long - Haiku has context limits
- Keep the response format simple (just the name, no explanation)
- Consider adding "Output only the name, nothing else" to prevent chatty responses
- Test with edge cases: vague descriptions, multiple tasks, single task
