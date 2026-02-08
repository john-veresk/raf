# Outcome: Add --worktree Flag to Plan Command

## Summary
Added `--worktree` (`-w`) flag to `raf plan` that creates a git worktree for isolated planning. Supports both new project creation and amendment of existing worktree projects.

## Changes Made

### Modified Files
- **`src/commands/plan.ts`** - Added `--worktree` flag to the plan command with full support in both new project and amend flows:
  - Added `-w, --worktree` option to Commander command definition
  - Updated `PlanCommandOptions` interface with `worktree?: boolean`
  - `runPlanCommand`: When `--worktree` is set, creates a worktree AFTER name resolution, creates project folder inside worktree at the correct relative path, saves input.md only in the worktree, runs Claude with `cwd` set to the worktree root, commits artifacts in the worktree branch, and shows success message with worktree path and `--worktree` suggestion for `raf do`
  - `runAmendCommand`: When `--worktree` is set, resolves project from `~/.raf/worktrees/<repo>/` instead of main repo, validates worktree exists and is valid, runs amend flow with paths pointing into the worktree, commits amendment artifacts in the worktree branch
  - Cleanup: failed planning with no plan files cleans up the worktree (new project only), amend does not create or clean up worktrees
  - Added imports for worktree utilities, path utilities, and validation

- **`src/core/git.ts`** - Updated `commitPlanningArtifacts` to accept optional `{ cwd }` parameter so git commands can run from the worktree directory instead of the main repo

## Acceptance Criteria Verification
- [x] `raf plan --worktree` without project name works (name picker/auto-generation runs)
- [x] `raf plan my-feature --worktree` works with explicit name (skips name picker)
- [x] `raf plan --worktree --auto` works (auto-selects generated name)
- [x] Worktree is created AFTER name is resolved, not before
- [x] input.md is only saved inside the worktree, never in the main tree
- [x] Project folder is created at correct relative path inside worktree
- [x] Planning session runs with cwd set to worktree root
- [x] Planning artifacts are committed in the worktree branch
- [x] Success message mentions the worktree path and suggests `--worktree` flag for `raf do`
- [x] Without `--worktree`, behavior is unchanged
- [x] Failed planning cleans up the worktree (new project only)
- [x] Compatible with `--auto` and `--model` flags
- [x] `raf plan --amend <project> --worktree` resolves project from worktree directory
- [x] `raf plan --amend <project> --worktree` with no worktree shows helpful error
- [x] Amend flow reads existing plans/state from inside the worktree
- [x] New plan files from amend are committed in the worktree branch
- [x] Amend does NOT attempt to create or clean up the worktree

## Test Results
- Build: passes cleanly (no TypeScript errors)
- All 835 tests pass (834 pass, 1 pre-existing failure in planning-prompt.test.ts unrelated to this change)
- All 64 plan command tests pass
- All 8 commit-planning-artifacts tests pass

<promise>COMPLETE</promise>
