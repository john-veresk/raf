# Task: Stash Changes on Complete Failure

## Objective
Automatically git stash uncommitted changes when a task completely fails (no more retries planned).

## Context
When a task fails after all retry attempts, any changes Claude made may be left in the working directory in an incomplete state. This task adds automatic stashing of these changes to preserve them while leaving the working directory clean.

## Requirements
- Stash changes only when task completely fails (all retries exhausted, no more attempts)
- Do NOT stash during retry attempts - only on final failure
- Use descriptive stash name: `raf-{project-number}-task-{task-number}-failed`
- Log message telling user about the stash with the stash name
- Example log: `Changes stashed as: raf-001-task-3-failed`

## Implementation Steps
1. Modify `src/core/git.ts` to add a `stashChanges(name: string)` function
2. In `src/commands/do.ts`, after a task is marked as completely failed (no more retries):
   - Check if there are uncommitted changes using existing `getChangedFiles()`
   - If changes exist, call `stashChanges()` with formatted name
   - Log the stash name to inform the user
3. Format stash name as: `raf-{projectNumber}-task-{taskId}-failed`
4. Use `git stash push -m "{stash-name}"` command

## Acceptance Criteria
- [ ] Changes are stashed when task fails completely (after all retries)
- [ ] Changes are NOT stashed during retry attempts
- [ ] Stash name follows format: `raf-001-task-3-failed`
- [ ] User sees log message with stash name
- [ ] No stash created if no uncommitted changes exist
- [ ] All existing tests pass

## Notes
- Only stash if there are actual changes (check with `git status`)
- The stash preserves both staged and unstaged changes
- User can recover with `git stash list` and `git stash pop stash@{n}`
- Consider adding the stash name to the task failure outcome for reference
