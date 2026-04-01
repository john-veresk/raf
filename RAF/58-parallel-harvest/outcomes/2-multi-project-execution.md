# Multi-Project Sequential Execution

## Summary
Updated `raf do` to accept multiple project arguments and execute selected projects sequentially, with a batch summary when multiple projects are run.

## Changes
- **src/commands/do.ts**:
  - Changed `.argument('[project]', ...)` to `.argument('[projects...]', ...)` for Commander variadic support
  - Updated action signature from `(project: string | undefined, ...)` to `(projects: string[], ...)`
  - Refactored `runDoCommand` to accept `string[]` and iterate over all projects sequentially
  - Extracted `resolveProjectFromIdentifier()` helper to resolve a single project identifier (handles worktree detection, ambiguous names)
  - Added `ProjectToRun` interface for the list of projects to execute
  - Each project's full flow runs independently: worktree setup, post-action picker, execution, post-action, push
  - A failing project no longer aborts subsequent projects — errors are caught and recorded
  - Batch summary printed when multiple projects are executed (lists completed/failed projects)
  - Exit code is 1 if any project failed, 0 if all succeeded
  - Single-project flow preserved: one project = same behavior as before (no batch summary)

## Notes
- The `select` import remains as it's still used by `pickPostExecutionAction`
- Pre-existing test failures in `claude-runner.test.ts` and `post-execution-picker.test.ts` are unrelated to this change
- All 100 relevant tests pass (do-command, project-picker, failure-history, etc.)

<promise>COMPLETE</promise>
