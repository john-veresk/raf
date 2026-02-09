# Outcome: Remove Multi-Project Support from raf do

## Summary

Simplified `raf do` to accept only a single project identifier, removing the multi-project execution feature. The command argument changed from `[projects...]` (variadic) to `[project]` (single optional). All multi-project logic was removed.

## Key Changes

### `src/commands/do.ts`
- Changed `.argument('[projects...]', ...)` to `.argument('[project]', ...)`
- Changed action handler signature from `(projects: string[], ...)` to `(project: string | undefined, ...)`
- Rewrote `runDoCommand()` to work with a single optional identifier:
  - No array iteration, deduplication (`seenPaths`), or error accumulation
  - Direct project resolution instead of loop
  - Simplified merge check: `result.success` instead of `results.every(r => r.success)`
- Removed `printMultiProjectSummary()` function entirely
- Removed `isMultiProject` flag and multi-project verbose logging
- Removed verbose model logging for multi-project (`if (verbose && model && resolvedProjects.length > 1)`)
- Removed worktree guard for multiple projects (no longer needed)
- Removed unused `SYMBOLS` import

### `tests/unit/do-multiproject.test.ts`
- Deleted entirely

### `tests/unit/do-command.test.ts`
- Removed "Multiple Projects with Full Folder Names" describe block
- Removed "Mixed Formats" describe block (tested multi-identifier resolution)
- Kept all single-project, backward compatibility, and error handling tests

### `README.md`
- Removed `raf do 3 4 5` example from usage
- Changed command reference from `raf do [projects...]` to `raf do [project]`
- Removed `--worktree supports a single project at a time (no multi-project)` line

### `CLAUDE.md`
- Removed `### Multi-Project Execution` section from architectural decisions
- Removed `--worktree supports single project only (no multi-project)` line from worktree section

## Acceptance Criteria Verification

- [x] `raf do 3` works for a single project
- [x] `raf do` (no args) still shows interactive picker
- [x] `raf do --worktree` still shows worktree picker
- [x] `raf do 3 4` — Commander.js with `[project]` ignores extra args
- [x] `printMultiProjectSummary` and multi-project loop removed
- [x] `do-multiproject.test.ts` removed
- [x] README.md and CLAUDE.md updated (no multi-project references)
- [x] All remaining tests pass (843 pass, 1 pre-existing failure in planning-prompt.test.ts unrelated)

<promise>COMPLETE</promise>
