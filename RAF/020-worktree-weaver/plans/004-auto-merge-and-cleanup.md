# Task: Auto-merge on Project Completion

## Objective
When `--merge` flag is present on `raf do --worktree`, automatically merge the project branch into the original branch after all tasks complete successfully.

## Context
After worktree execution completes, the user may want to merge the project branch back into the branch from which `raf` was originally called. This is controlled by the `--merge` flag (only valid with `--worktree`). The worktree itself is NOT cleaned up or removed after merge — it stays in place.

## Dependencies
003

## Requirements
- Add `--merge` boolean flag to the do command in Commander.js
- `--merge` is only valid when `--worktree` is also present — error if `--merge` is used without `--worktree`
- After all tasks complete (project state is "completed") and `--merge` is set, attempt auto-merge:
  1. Switch back to the original branch (the branch that was active when `raf do --worktree` was invoked)
  2. Attempt merge using the merge utility from task 001 (tries ff first, falls back to merge-commit)
  3. On success: log success message with merge details
  4. On conflict: `git merge --abort` is called by the utility, log a warning with the branch name so the user can merge manually
- Record the original branch name at the start of `raf do --worktree` execution (before switching to worktree)
- The merge must happen from the ORIGINAL repo's working directory, not from inside the worktree
- If the project is NOT fully completed (has failures), skip the merge entirely — just show a message about the worktree branch
- The merge should also work for partially completed projects that were continued with `--force` and are now fully complete
- Do NOT remove or clean up the worktree after merge — the worktree stays in place

## Implementation Steps
1. Add `--merge` option to the Commander command definition in `src/commands/do.ts`
2. Validate that `--merge` is only used with `--worktree`, error otherwise
3. In the `do` command's worktree flow, record the current branch name before execution starts
4. After the task execution loop completes, check if `--merge` is set and the project is fully completed
5. If completed with `--merge`: call the merge utility from task 001 (passing original branch, project branch, and paths)
6. Handle merge result: success -> log success, conflict -> log warning with manual merge instructions
7. If project has failures: just note that the worktree branch is available for inspection
8. No worktree cleanup or removal after merge

## Acceptance Criteria
- [ ] `--merge` flag is added to the do command
- [ ] `--merge` without `--worktree` shows an error
- [ ] On full project completion with `--merge`, merge is attempted
- [ ] Successful merge logs a clear success message
- [ ] Merge conflicts trigger `git merge --abort` and show warning with branch name and manual merge instructions
- [ ] Incomplete projects (failures) skip merge and mention the branch
- [ ] Original branch is correctly recorded and restored
- [ ] Worktree is NOT removed or cleaned up after merge
- [ ] Without `--merge`, no merge is attempted even if project completes

## Notes
- The merge happens in the original repo directory, not the worktree — this is important because `git merge` needs to be on the target branch
- The current branch at invocation time should be captured early (before any worktree operations change context)
- Consider the case where the user's original branch has moved forward (other commits) while the worktree was being worked on — if ff fails, a merge-commit is created; only conflicts cause failure
- Reference the worktree utility functions from task 001 for merge operations
