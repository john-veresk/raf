# Task: Simplify Git Logic - Claude Commits Changes

## Objective
Simplify git operations by instructing Claude to commit its own changes during task execution, removing the smart commit logic from RAF.

## Context
Currently, RAF captures a "baseline" of changed files before each task, then commits only the delta after task completion. This adds complexity and can miss files or include unrelated changes. By instructing Claude to commit after making changes, we simplify the codebase and give Claude more control over what gets committed.

## Requirements
- Claude must be instructed to commit changes after completing task work
- Commit message format: `[project-name] task description` (no task numbers)
- Outcome file should be included in Claude's commit
- Remove smart commit logic (baseline tracking, delta filtering)
- Remove `commitTaskChanges`, `setTaskBaseline`, `getTaskBaseline` functions
- RAF should NOT commit after task completion (Claude does it)
- Keep stash functionality for failure cases

## Implementation Steps

1. **Update execution prompt** (`src/prompts/execution-prompt.ts` or similar)
   - Add explicit instructions for Claude to commit after making changes
   - Specify commit message format: `[project-name] task description`
   - Instruct to include outcome file in the commit
   - Example instruction:
     ```
     After completing your work, commit all changes with:
     git add -A && git commit -m "[project-name] brief description of changes"

     Include the outcome file in your commit.
     ```

2. **Remove smart commit logic** (`src/core/git.ts`)
   - Remove `commitTaskChanges` function
   - Remove baseline-related functions:
     - `getTaskChangedFiles`
     - Any baseline tracking utilities
   - Keep `stashChanges` for failure handling
   - Keep `isGitRepo` for validation

3. **Update `raf do` command** (`src/commands/do.ts`)
   - Remove baseline capture before task execution
   - Remove commit call after task success
   - Keep stash call on task failure
   - Remove commit hash tracking (no longer relevant)

4. **Update outcome generation**
   - Ensure outcome file is written BEFORE Claude is asked to commit
   - Or instruct Claude to write the outcome as part of its work

5. **Simplify git.ts exports**
   - Export only necessary functions:
     - `isGitRepo`
     - `stashChanges`
     - `getChangedFiles` (for status display if needed)

6. **Update tests**
   - Remove tests for smart commit logic
   - Add tests for new prompt instructions
   - Update integration tests

## Acceptance Criteria
- [ ] Execution prompt includes commit instructions for Claude
- [ ] Commit message format is `[project-name] task description`
- [ ] Smart commit logic (baseline tracking) is removed
- [ ] RAF does not commit after task completion
- [ ] Outcome file is committed by Claude
- [ ] Stash functionality still works on task failure
- [ ] All tests pass

## Notes
- This changes the responsibility model: Claude commits, RAF orchestrates
- If Claude fails to commit, changes remain uncommitted (user can handle manually)
- Consider adding a fallback commit in RAF if Claude didn't commit - but user chose not to do this
- Outcome file path needs to be passed to Claude so it knows what to include
