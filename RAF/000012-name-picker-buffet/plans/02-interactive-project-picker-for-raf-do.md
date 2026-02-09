# Task: Interactive Project Picker for `raf do`

## Objective
Allow users to run `raf do` without specifying a project name and interactively select from pending projects using arrow-key navigation.

## Context
Currently `raf do` requires a project identifier. This task adds an interactive picker when no identifier is provided, making it easier to continue work on pending projects.

## Requirements
- Show all pending projects when `raf do` is called without arguments
- Use `@inquirer/prompts` for arrow-key selection UI
- Display project info: number, name, and progress (e.g., "001 fix-auth-bug (2/5 tasks)")
- Order by project number (oldest first)
- Handle case when no pending projects exist (show message, exit gracefully)

## Implementation Steps
1. Create a new module `src/ui/project-picker.ts`:
   - `pickPendingProject(): Promise<string | null>` - shows arrow-key list of pending projects
   - Format each choice with project number, name, and task progress
   - Return selected project folder name or null if cancelled/empty
2. Update `src/commands/do.ts`:
   - Check if project identifier is provided
   - If not, call `discoverProjects()` and filter to pending/in-progress
   - If no pending projects, show message and exit
   - Show project picker UI
   - Continue with selected project
3. Reuse existing state derivation logic from `src/core/state-derivation.ts`:
   - `deriveProjectState()` to get task counts
   - `getDerivedStats()` to get pending/completed counts
4. Add unit tests for project picker UI (mock inquirer and file system)

## Acceptance Criteria
- [ ] Running `raf do` without arguments shows pending projects list
- [ ] Projects show number, name, and progress (X/Y tasks)
- [ ] User can navigate with arrow keys and select with Enter
- [ ] Selected project is executed
- [ ] Empty list shows friendly message "No pending projects found"
- [ ] Ctrl+C exits gracefully
- [ ] All tests pass

## Notes
- Consider using `@inquirer/prompts` select with separator or descriptions for better UX
- This task depends on `@inquirer/prompts` being added in task 001, but can be done in parallel if the dependency is already installed
