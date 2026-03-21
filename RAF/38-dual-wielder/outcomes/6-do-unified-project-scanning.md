# Task 6: Unified Project Scanning in `raf do` Worktree Mode

## Summary
Made `raf do --worktree` show both worktree and main-repo pending projects in the interactive picker, instead of only worktree projects.

## Changes Made

### `src/commands/do.ts`
- Rewrote `discoverAndPickWorktreeProject()` to use `getPendingWorktreeProjects()` and `getPendingProjects()` from `project-picker.ts` instead of reimplementing scanning logic
- Added main-repo pending projects to the picker (no threshold filter on main-repo projects)
- Threshold filter still applies to worktree projects only
- Deduplication: worktree versions take precedence over main-repo versions (same logic as `pickPendingProject()`)
- Uses `formatProjectChoice()` for consistent display with `[worktree]` suffix on worktree projects
- Changed return type to `{ worktreeRoot?: string; projectFolder: string }` — when a main-repo project is selected, `worktreeRoot` is undefined and the downstream worktree creation flow kicks in as normal
- Removed unused `parseProjectPrefix` import
- Added `formatProjectChoice` to static imports

## Acceptance Criteria
- [x] `raf do --worktree` shows pending projects from both worktree and main repo
- [x] Duplicate projects are deduped with worktree version taking precedence
- [x] Selecting a main-repo project in worktree mode correctly creates/uses a worktree (worktreeRoot is undefined, falls through to existing worktree creation logic)
- [x] Existing worktree-only scanning behavior is replaced by unified scanning
- [x] No regressions in standard (non-worktree) mode — that code path is untouched

<promise>COMPLETE</promise>
