# Task: Commit Outcomes on Project Complete

## Objective
Automatically commit the project folder to git when all tasks in a project are completed successfully.

## Context
When a project finishes (all tasks completed), the outcomes and project state should be automatically committed to preserve the work. This eliminates the manual step of committing after project completion and ensures project history is captured consistently.

This task builds on the existing `raf do` command implementation.

## Requirements
- Trigger: Automatically detect when the final task in a project completes successfully inside `raf do`
- Scope: Commit the entire project folder (plans, outcomes, decisions, input.md, state.json, etc.)
- Commit message format: `RAF(<project-name>): outcomes`
  - Example: `RAF(005-task-naming-improvements): outcomes`
- Handle dirty repo: Stage and commit only the project folder, leave other uncommitted changes untouched
- Only commit on success - if the final task fails, do not commit

## Implementation Steps
1. Read the current `do.ts` command implementation in `src/commands/`
2. Identify where task completion is detected (success/failure handling)
3. Add a helper function to check if project is complete:
   - Load project state
   - Check if all tasks have status "completed"
4. Create a git commit utility function in `src/utils/`:
   - Accept project folder path and project name
   - Stage only files within the project folder: `git add <project-folder>`
   - Create commit with message: `RAF(<project-name>): outcomes`
   - Handle git errors gracefully (not a git repo, nothing to commit, etc.)
5. Integrate the commit logic into `raf do`:
   - After a task completes successfully, check if this was the final task
   - If project is now complete, call the commit utility
   - Log success message: "Project complete. Committed to git."
6. Add tests for:
   - Committing when final task completes
   - Not committing when task fails
   - Not committing when project still has pending tasks
   - Handling non-git repos gracefully
   - Handling when project folder has no changes

## Acceptance Criteria
- [ ] When `raf do` completes the final task successfully, project folder is auto-committed
- [ ] Commit message follows format `RAF(<project-name>): outcomes`
- [ ] Only project folder is staged/committed, other repo changes are untouched
- [ ] No commit is made if the final task fails
- [ ] Graceful handling when not in a git repo (warning, no crash)
- [ ] Graceful handling when there are no changes to commit
- [ ] Tests cover the commit-on-complete workflow
- [ ] Success message is logged after commit

## Notes
- Use `child_process.execSync` or similar for git commands
- Consider extracting git utilities to `src/utils/git.ts` for reusability
- The project folder path can be derived from the project identifier resolution (task 001)
- Be careful with error handling - git failures should not crash `raf do`
