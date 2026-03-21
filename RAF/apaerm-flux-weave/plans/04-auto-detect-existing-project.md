---
effort: low
---
# Task: Auto-Detect Existing Project on `raf plan project-name`

## Objective
When a user runs `raf plan project-name` without `--amend`, check if a project with that exact name already exists and prompt whether they want to amend it instead.

## Context
Users sometimes forget to add the `--amend` flag when they want to add tasks to an existing project. Currently, `raf plan project-name` would either create a duplicate or fail. Instead, we should detect the existing project and ask the user if they meant to amend.

## Dependencies
01

## Requirements
- Only check for exact name matches (case-insensitive)
- Search both main repo and all worktrees for the existing project
- If found, prompt the user: "Project 'project-name' already exists (ID: X). Did you mean to amend it?"
- If user says yes, redirect to the amend flow
- If user says no, proceed with creating a new project (or abort — user's choice)

## Implementation Steps

1. **In `src/commands/plan.ts`, in `runPlanCommand()`** (around line 109):
   - After the project name is determined but before creating the project folder
   - Check if a project with the exact same name exists using `resolveProjectIdentifierWithDetails()` searching by name
   - Also check worktrees using `resolveWorktreeProjectByIdentifier()`

2. **Add the user prompt:**
   - Use the existing interactive prompt pattern (inquirer or similar) already used in the codebase
   - Show: "Project '{name}' already exists (ID: {id}). Did you want to amend it?"
   - Options: "Yes, amend it" / "No, create a new project" / "Cancel"
   - If "Yes", call `runAmendCommand()` with the existing project's ID
   - If "No", continue with normal project creation
   - If "Cancel", exit

3. **Handle worktree context:**
   - If the existing project is in a worktree, the amend redirect should include `--worktree`
   - If the existing project is in main, redirect without `--worktree`

## Acceptance Criteria
- [ ] `raf plan my-project` detects existing project named "my-project" and prompts
- [ ] Exact match only — "my" does NOT match "my-project"
- [ ] Case-insensitive matching — "My-Project" matches "my-project"
- [ ] User can choose to amend, create new, or cancel
- [ ] Choosing amend redirects to the amend flow correctly
- [ ] Projects in worktrees are also detected
- [ ] `raf plan --amend` is not affected by this change (no double-prompt)

## Notes
- This check should only happen in the `raf plan` flow (not `--amend` which already knows it's amending).
- The prompt should be skipped if running in non-interactive mode (e.g., `--auto` / `-y` flag).
