# Task: Implement `--amend` Flag for `raf plan`

## Objective
Add a `--amend` flag to the `raf plan` command that allows adding new tasks to existing projects without modifying completed tasks.

## Context
Users need the ability to extend existing plans with new tasks as requirements evolve. The `--amend` flag provides a controlled way to add tasks while preserving the integrity of completed work.

## Requirements
- Command signature: `raf plan --amend <project-identifier>`
- When `raf plan <existing-project>` is used without `--amend`, show an error
- In amend mode:
  - Open editor for user to describe new tasks (same as regular planning)
  - Launch interactive Claude session with context of existing tasks
  - Claude should see all existing tasks with their status (completed/pending/failed)
  - New tasks are numbered sequentially after existing tasks
  - Only adding new tasks is supported (no modification/deletion of existing)
- Show warning if project is fully completed but allow amendment
- Support all identifier formats for the project argument

## Implementation Steps
1. Read the current `plan.ts` command implementation in `src/commands/`
2. Add the `--amend` option to the Commander.js command definition:
   ```typescript
   .option('-a, --amend <identifier>', 'Add tasks to an existing project')
   ```
3. Modify the command logic to detect existing project:
   - If project identifier matches existing project AND no `--amend` flag → error with helpful message
   - If `--amend` flag provided → enter amend mode
4. Create or modify the planning prompt for amend mode:
   - Include summary of existing tasks and their status
   - Instruct Claude to add new tasks starting from the next number
   - Preserve the original `input.md` content as context
5. Load existing project state:
   - Read all plan files from `plans/` directory
   - Read outcomes from `outcomes/` directory
   - Build task status summary (completed/pending/failed)
6. Update the editor flow:
   - Pre-populate with context about existing tasks (as reference)
   - User adds description of NEW tasks only
7. Launch interactive Claude session with the amend-specific prompt
8. Handle the warning for fully completed projects:
   - Check if all tasks are completed
   - Display warning: "Project is fully completed. New tasks will extend the existing plan."
   - Continue with amendment
9. Add tests for:
   - `raf plan --amend 003` with pending tasks
   - `raf plan --amend 003` with all tasks completed (warning shown)
   - `raf plan existing-project` without flag (error)
   - Various identifier formats with `--amend`

## Acceptance Criteria
- [ ] `raf plan --amend 003` opens editor then launches Claude with existing task context
- [ ] `raf plan --amend 001-my-project` works with full folder name identifier
- [ ] `raf plan existing-project` (without `--amend`) shows clear error message
- [ ] Claude receives context about existing tasks and their status
- [ ] New tasks are numbered correctly (continuing from last task number)
- [ ] Warning is displayed when amending a fully completed project
- [ ] Amending creates new plan files without touching existing ones
- [ ] Tests cover the amend workflow
- [ ] Help text documents the `--amend` option

## Notes
- This task depends on task 001 for identifier resolution
- Consider creating a separate prompt file in `src/prompts/` for the amend context
- The editor content should clearly distinguish between existing task summary (read-only context) and the area for new task descriptions
- Be careful not to accidentally modify or renumber existing plan files
