# Task: Remove All RAF-Side Git Commits

## Objective
Remove all git commit operations from RAF since Claude will handle all commits during task execution.

## Context
Currently RAF commits after planning and after project completion. The new workflow has Claude handle all commits as part of task execution - one commit per task containing both code changes and outcome file.

## Requirements
- Remove the planning phase commit (`RAF[NNN:plan]`)
- Remove the outcome/completion commit (`RAF[NNN:outcome]`)
- Keep git utility functions that might be needed for other purposes (status checks, stashing)
- Update CLAUDE.md to reflect new commit workflow

## Implementation Steps
1. Update `src/commands/plan.ts`:
   - Remove call to `commitProjectFolder(..., 'plan')`
   - Remove any related error handling for commit failures
2. Update `src/commands/do.ts`:
   - Remove call to `commitProjectFolder(..., 'outcome')`
   - Remove the auto-commit logic after task/project completion
   - Keep stash logic for failed tasks (still useful)
3. Review `src/core/git.ts`:
   - Keep the module but remove or deprecate `commitProjectFolder` if no longer needed
   - Alternatively, keep it for potential future use but remove all callers
4. Update any tests that verify RAF commit behavior
5. Update CLAUDE.md "Git Commit Schema" section:
   - Remove "RAF-generated commits" section
   - Update to show only Claude-generated commits

## Acceptance Criteria
- [ ] `raf plan` does not create any git commits
- [ ] `raf do` does not create any git commits
- [ ] Git stashing on failure still works
- [ ] No errors when running in non-git directories
- [ ] CLAUDE.md updated to reflect new workflow
- [ ] All tests pass (update tests that expected commits)

## Notes
- This is a simplification - less code, clearer responsibility
- Make sure to remove/update tests that verified commit behavior
- Keep git.ts utilities that are still useful (hasUncommittedChanges, stashChanges)
