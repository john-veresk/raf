# Outcome: Auto-recreate worktree from existing branch in amend flow

## Summary

Modified `runAmendCommand()` in `src/commands/plan.ts` to auto-recreate worktrees when `raf plan --amend --worktree` is run and the worktree directory doesn't exist (e.g., after automatic cleanup on successful execution). Two fallback paths are supported:

1. **Branch exists** (common after cleanup): Recreates worktree from the existing branch using `createWorktreeFromBranch()`
2. **No branch exists**: Creates a fresh worktree with `createWorktree()` and copies project files from the main repo using `fs.cpSync()`

## Key Changes

### Files Modified
- `src/commands/plan.ts` — Replaced the hard error when no worktree is found with a two-tier fallback: resolve project from main repo, check for existing branch, recreate or create fresh worktree. Also removed the early exit when the worktree base directory doesn't exist (now gracefully skips the search and falls through to the fallback).
- `CLAUDE.md` — Updated worktree lifecycle documentation to mention recreate-on-amend scenarios and new utility functions.
- `tests/unit/plan-amend-worktree-recreate.test.ts` — New test file with 11 tests covering: decision logic, branch recreation, fresh creation, file copy, error handling, and existing-flow preservation.

### Implementation Details
- When worktree search finds no match, resolves the project from the main repo using `resolveProjectIdentifierWithDetails(rafDir, identifier)`
- Extracts folder name via `path.basename()` (folder name = branch name)
- Uses `branchExists()` (from task 001) to decide which path
- `createWorktreeFromBranch()` (from task 001) recreates from existing branch — project files are already on the branch
- `createWorktree()` creates a fresh worktree, then `fs.cpSync()` copies the project folder from main repo
- Both paths set `matchedWorktreeDir` and `matchedProjectPath` so the rest of the amend flow continues seamlessly
- Info messages logged: "Recreated worktree from branch: <name>" or "Created fresh worktree and copied project files: <name>"
- Error if project not found in main repo or worktrees: "Project not found in any worktree or main repo: <identifier>"

### Test Coverage
- Decision logic: branch exists → createWorktreeFromBranch, branch doesn't exist → createWorktree
- Branch recreation: success path, branch-not-found error
- Fresh worktree: success with -b flag
- File copy: all project files (input.md, decisions.md, plans/, outcomes/) copied correctly with preserved structure
- Error handling: project not found, createWorktreeFromBranch failure, createWorktree failure
- Existing flow: worktree search match skips recreation

## Verification
- TypeScript compiles without errors
- All 882 tests pass (871 existing + 11 new), 1 pre-existing failure in `planning-prompt.test.ts` (unrelated)
- No regressions introduced

<promise>COMPLETE</promise>
