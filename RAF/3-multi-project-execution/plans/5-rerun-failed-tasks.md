# Task: Support Re-Running Failed/Pending Tasks

## Objective
Allow users to re-run `raf do project-name` on a project that has already been executed, automatically resuming from failed or pending tasks.

## Context
Currently, running `raf do` on a project that has been executed just shows statistics. Users need the ability to retry failed tasks (e.g., after API unavailability, token limits reached) without manually tracking state. The system should derive what needs to be done from the folder structure.

## Requirements
- `raf do project-name` on an existing project should:
  - Skip tasks with `## Status: SUCCESS` in their outcome files
  - Re-run tasks with `## Status: FAILED` in their outcome files
  - Run tasks with no outcome file (pending)
- Add `--force` flag to re-run even completed projects (all tasks)
- If all tasks are complete and no `--force` flag, show message and exit
- Derive task status from outcome files (implemented in task 001)

## Implementation Steps

1. **Update task selection logic** (`src/commands/do.ts`)
   - Use derived state to get task statuses
   - Filter for tasks that are NOT completed (no SUCCESS outcome)
   - Include failed tasks (FAILED outcome) for retry
   - Include pending tasks (no outcome file)

2. **Add `--force` flag**
   - Add `-f, --force` option to `raf do` command
   - When `--force` is set, run all tasks regardless of status
   - Consider: should `--force` delete existing outcome files first? Decision: No, let Claude overwrite

3. **Handle already-complete projects**
   - Check if all tasks have SUCCESS outcomes
   - If yes and no `--force`, display message: "All tasks completed. Use --force to re-run."
   - Exit gracefully (exit code 0)

4. **Update execution loop**
   - Before running a task, check if it should be skipped (SUCCESS outcome exists)
   - Log which tasks are being skipped
   - Log which tasks are being retried (had FAILED outcome)

5. **Handle outcome file updates**
   - When retrying a failed task, the new outcome will overwrite the old one
   - Ensure outcome file path is consistent

6. **Update console output**
   - Show clear indication of:
     - "Skipping task X (already completed)"
     - "Retrying task X (previously failed)"
     - "Running task X"

7. **Update tests**
   - Test resume from failed task
   - Test skip completed tasks
   - Test `--force` flag behavior
   - Test "all complete" message

## Acceptance Criteria
- [ ] `raf do project-name` skips tasks with SUCCESS outcome
- [ ] `raf do project-name` retries tasks with FAILED outcome
- [ ] `raf do project-name` runs tasks without outcome files
- [ ] `--force` flag runs all tasks regardless of status
- [ ] Clear console output indicates skip/retry/run status
- [ ] All tests pass

## Notes
- Depends on task 001 (state derivation)
- Task order is determined by plan file numbering (001, 002, etc.)
- Consider: should we clear FAILED outcome before retry? Decision: No, let new outcome overwrite
- Edge case: outcome file exists but is empty or malformed - treat as pending
