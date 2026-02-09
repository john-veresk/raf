# Task: Add Post-Execution Picker for Worktree Mode

## Objective
Replace the `--merge` flag with an interactive picker shown before task execution that lets users choose what to do with the worktree branch after tasks complete: merge, create PR, or leave the branch.

## Dependencies
001, 003

## Context
Currently `raf do --worktree --merge` is the only way to handle the branch after execution. This task replaces that with a better UX: an interactive picker shown before execution starts, so the user declares intent upfront. After all tasks succeed, the chosen action is performed automatically. On failure, the action is skipped.

## Requirements
- Remove the `--merge` CLI flag from the `do` command
- When `--worktree` is used, show an interactive picker before task execution begins with three options:
  1. **Merge** — merge the worktree branch into the original branch (existing behavior)
  2. **Create PR** — push the branch and create a GitHub PR (uses task 003's PR creation module)
  3. **Leave branch** — do nothing, keep the worktree branch as-is
- Store the user's choice and execute it automatically after all tasks complete successfully
- If any task fails, skip the post-execution action and inform the user
- The picker should use the existing interactive selection pattern used elsewhere in RAF (or a simple numbered prompt if no pattern exists)

## Implementation Steps
1. Remove the `--merge` flag from the `do` command's Commander.js option definition
2. Add the interactive picker UI — display the three options and capture user choice before task execution loop starts
3. Refactor the merge logic: extract the existing merge code into a callable function if not already
4. After the task execution loop completes, check if all tasks succeeded
5. If successful, execute the chosen action: call merge function, PR creation function, or do nothing
6. If failed, log that the post-execution action was skipped due to failures
7. Update any documentation or help text referencing `--merge`
8. Write tests for the picker flow and post-execution action dispatch
9. Update CLAUDE.md to document the new workflow

## Acceptance Criteria
- [ ] `--merge` flag is removed from `raf do`
- [ ] Interactive picker appears before task execution when `--worktree` is used
- [ ] Picker offers three options: merge, create PR, leave branch
- [ ] Chosen action executes automatically after all tasks succeed
- [ ] Action is skipped with a message when tasks fail
- [ ] PR creation option works end-to-end (push + create PR)
- [ ] Merge option works as before
- [ ] Leave branch option does nothing (clean exit)
- [ ] Tests cover picker logic and action dispatch
- [ ] All existing tests pass
- [ ] CLAUDE.md updated

## Notes
- The picker must appear BEFORE execution starts (user's explicit requirement)
- For the PR option, the branch needs to be pushed to remote first — handle this as part of the PR creation flow
- Consider what happens if the user picks PR but `gh` is not installed — detect early and fall back or warn
- The existing merge logic in `do.ts` (lines ~356-377) should be preserved but made callable independently
- Worktree cleanup behavior should match the chosen action: cleanup after merge, preserve for PR and leave-branch
