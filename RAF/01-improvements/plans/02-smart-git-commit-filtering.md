# Task: Smart Git Commit Filtering

## Objective
Only commit files that were actually changed during task execution, excluding pre-existing changes and RAF's internal state.json file.

## Context
Currently, RAF commits all unstaged changes after a task completes, which can include:
- Files the user was working on before running RAF
- Unrelated changes from other tools/editors
- RAF's own state.json file

This task implements smart filtering to commit only files modified by Claude during the specific task execution.

## Requirements
- Capture git status BEFORE task execution starts
- Store baseline in state.json (field: `filesBeforeTask`)
- At commit time, compare current changes to baseline
- Only stage files that were changed during this task
- Exclude state.json from all task commits
- Keep standard commit message format: "RAF Task XX: Complete"
- Handle case where no task-specific changes exist (skip commit)

## Implementation Steps

1. **Capture baseline before task execution**
   - Location: `src/commands/do.ts` (before spawning Claude process)
   - Run `git status --porcelain` to get current working tree state
   - Parse output into list of modified/added/deleted files
   - Store in state.json under current task: `tasks[currentTask].filesBeforeTask`
   - Handle case where git is not initialized (skip tracking)

2. **Update state.json type definitions**
   - Location: `src/types/state.ts`
   - Add `filesBeforeTask?: string[]` to Task interface
   - Ensure type safety throughout

3. **Implement smart file filtering at commit time**
   - Location: `src/core/executor.ts` or wherever commit logic lives
   - After task completes, run `git status --porcelain` again
   - Compare to baseline stored in state.json
   - Identify files changed during task: `currentFiles - filesBeforeTask`
   - Filter out `state.json` from the list
   - If no files remain, skip commit entirely

4. **Create utility for git status parsing**
   - Location: `src/utils/git.ts`
   - Function: `parseGitStatus(output: string): string[]`
   - Handle git porcelain format (M, A, D, ??, etc.)
   - Return array of file paths
   - Function: `getChangedFiles(): Promise<string[]>`
   - Wrapper that runs git command and parses output

5. **Update commit logic**
   - Stage only filtered files: `git add <file1> <file2> ...`
   - DO NOT use `git add .` or `git add -A`
   - If filtered list is empty, log message and skip commit
   - Keep existing commit message format

6. **Handle edge cases**
   - Git not initialized: Skip all git operations gracefully
   - No baseline captured: Log warning, commit all changes (fallback to current behavior)
   - File deleted during task: Handle `git add` of deleted files with `git add -u <file>`
   - State.json modified but not by task: Ensure it's still excluded

7. **Add tests**
   - Test: Only task-modified files are committed
   - Test: Pre-existing changes are not committed
   - Test: state.json is never committed
   - Test: Empty filtered list skips commit
   - Test: Git status parsing handles all file states (M, A, D, ??, etc.)
   - Test: Graceful handling when git is not initialized

## Acceptance Criteria
- [ ] Baseline captured before task execution
- [ ] Baseline stored in state.json
- [ ] Only task-modified files are staged at commit time
- [ ] state.json excluded from all commits
- [ ] Pre-existing changes left unstaged
- [ ] No commit made if no task-specific changes exist
- [ ] Deleted files handled correctly
- [ ] All tests pass
- [ ] No breaking changes to existing functionality

## Notes
- Git porcelain format reference: https://git-scm.com/docs/git-status#_short_format
- File states: M (modified), A (added), D (deleted), ?? (untracked), R (renamed)
- Consider using `git diff --name-only` as alternative to `git status --porcelain`
- The baseline should be captured as late as possible (right before Claude execution) to avoid including RAF's own setup changes
- If a file was modified before AND during the task, it should be committed (we can't separate the changes)