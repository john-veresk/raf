# Task: Universal Commit Schema for RAF

## Objective
Implement a universal commit schema for all RAF-triggered commits (plan and outcome) with consistent formatting.

## Context
RAF needs a consistent commit message format across all automated commits. This provides clear identification of RAF-generated commits in git history and makes it easy to understand what type of commit it is (plan, task, or outcome).

This task builds on the existing `raf do` command implementation and extends to `raf plan`.

## Requirements

### Commit Schema Format
- **Plan commits**: `RAF[<project-number>:plan]`
  - Example: `RAF[005:plan]`
  - Triggered by: RAF programmatically after `raf plan` creates plan files
- **Outcome commits**: `RAF[<project-number>:outcome]`
  - Example: `RAF[005:outcome]`
  - Triggered by: RAF programmatically when all tasks in a project complete via `raf do`
- **Task commits**: `RAF[<project-number>:<task-number>] <project-name> <task-name>`
  - Example: `RAF[005:001] task-naming-improvements enhance-identifier-resolution`
  - Triggered by: Claude during task execution (handled in separate task 006)

### Plan Commit Requirements
- Trigger: After `raf plan` successfully creates all plan files
- Scope: Commit the entire project folder (plans, decisions.md, input.md)
- Handle dirty repo: Stage and commit only the project folder
- Only commit on success - if planning fails, do not commit

### Outcome Commit Requirements
- Trigger: When final task in a project completes successfully via `raf do`
- Scope: Commit the entire project folder (plans, outcomes, decisions, input.md, state.json, etc.)
- Handle dirty repo: Stage and commit only the project folder
- Only commit on success - if the final task fails, do not commit

## Implementation Steps

### Part A: Git Utility
1. Create a git commit utility function in `src/utils/git.ts`:
   - Accept project folder path, project number, and commit type (plan/outcome)
   - Stage only files within the project folder: `git add <project-folder>`
   - Create commit with appropriate format based on type
   - Handle git errors gracefully (not a git repo, nothing to commit, etc.)

### Part B: Plan Commits
2. Read the current `plan.ts` command implementation in `src/commands/`
3. After Claude successfully creates plan files, call the git utility with type "plan"
4. Log success message: "Plan committed to git."

### Part C: Outcome Commits
5. Read the current `do.ts` command implementation in `src/commands/`
6. Identify where task completion is detected (success/failure handling)
7. Add a helper function to check if project is complete:
   - Load project state
   - Check if all tasks have status "completed"
8. After a task completes successfully, check if this was the final task
9. If project is now complete, call the git utility with type "outcome"
10. Log success message: "Project complete. Committed to git."

### Part D: Tests
11. Add tests for:
    - Plan commits after successful planning
    - Outcome commits when final task completes
    - Not committing when task/planning fails
    - Handling non-git repos gracefully
    - Handling when project folder has no changes

## Acceptance Criteria
- [ ] Git utility function supports both plan and outcome commit types
- [ ] Plan commits use format `RAF[<project-number>:plan]`
- [ ] Outcome commits use format `RAF[<project-number>:outcome]`
- [ ] `raf plan` auto-commits project folder after successful planning
- [ ] `raf do` auto-commits project folder when final task completes successfully
- [ ] Only project folder is staged/committed, other repo changes are untouched
- [ ] No commit is made if planning or final task fails
- [ ] Graceful handling when not in a git repo (warning, no crash)
- [ ] Graceful handling when there are no changes to commit
- [ ] Tests cover both plan and outcome commit workflows
- [ ] Success messages are logged after commits

## Notes
- Use `child_process.execSync` or similar for git commands
- Extract git utilities to `src/utils/git.ts` for reusability
- The project folder path can be derived from the project identifier resolution (task 001)
- Be careful with error handling - git failures should not crash RAF commands
- Task commits are handled separately in task 006 (Claude-triggered via execution prompt)
