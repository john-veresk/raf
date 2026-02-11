# Outcome: Sync Main Branch Before Worktree/PR Operations

## Summary
Implemented automatic syncing of the main branch with the remote before worktree creation and PR creation, with a configurable toggle. The main branch is auto-detected from `refs/remotes/origin/HEAD`, falling back to `main` or `master`. Failures produce warnings but don't block the workflow.

## Key Changes

### Types (`src/types/config.ts`)
- Added `syncMainBranch: boolean` to `RafConfig` interface
- Added default `syncMainBranch: true` to `DEFAULT_CONFIG`

### Config Utilities (`src/utils/config.ts`)
- Added `syncMainBranch` to `VALID_TOP_LEVEL_KEYS` set
- Added validation for `syncMainBranch` (must be boolean)
- Added `syncMainBranch` handling in `deepMerge()` function
- Added `getSyncMainBranch()` accessor function

### Worktree Utilities (`src/core/worktree.ts`)
- Added `SyncMainBranchResult` interface for sync operation results
- Added `detectMainBranch(cwd?)` function:
  - Detects main branch from `refs/remotes/origin/HEAD`
  - Falls back to `main` or `master` if origin/HEAD not set
- Added `pullMainBranch(cwd?)` function:
  - When not on main: fetches `origin main:main` (updates local ref directly)
  - When on main: runs `git fetch` + `git merge --ff-only`
  - Handles uncommitted changes, diverged branches, and network errors gracefully
- Added `pushMainBranch(cwd?)` function:
  - Pushes main branch to origin
  - Handles "already up-to-date" and rejection errors gracefully

### Plan Command (`src/commands/plan.ts`)
- Imported `getSyncMainBranch` and `pullMainBranch`
- Added main branch sync before worktree creation in `runPlanCommand()` for fresh worktrees
- Added main branch sync before worktree creation in `runAmendCommand()` for recreated worktrees

### Do Command (`src/commands/do.ts`)
- Imported `getSyncMainBranch`, `pullMainBranch`, and `pushMainBranch`
- Added main branch sync before worktree operations in `runDoCommand()`
- Added main branch push before PR creation in `executePostAction()` for the 'pr' case

### Documentation
- Updated `src/prompts/config-docs.md`:
  - Added `syncMainBranch` section with description
  - Updated validation rules to include `syncMainBranch`
  - Updated full example config to include `syncMainBranch: true`
- Updated `CLAUDE.md`:
  - Added `syncMainBranch` to config schema list
  - Added `getSyncMainBranch()` to helper accessors list

### Tests
- `tests/unit/config.test.ts`:
  - Added import for `getSyncMainBranch`
  - Added test for rejecting non-boolean `syncMainBranch`
  - Added test for accepting boolean `syncMainBranch` values
  - Added test for overriding `syncMainBranch` in config
  - Added test for default `syncMainBranch` value (true)
- `tests/unit/worktree.test.ts`:
  - Added imports for `detectMainBranch`, `pullMainBranch`, `pushMainBranch`
  - Added 5 tests for `detectMainBranch()`:
    - Detecting from origin/HEAD
    - Detecting master from origin/HEAD
    - Falling back to main
    - Falling back to master when main doesn't exist
    - Returning null when no main branch found
  - Added 7 tests for `pullMainBranch()`:
    - Error when main branch cannot be detected
    - Fetching main when not on main branch
    - Warning when local main has diverged
    - Failing when on main with uncommitted changes
    - Pulling successfully when on main with no changes
    - Reporting no changes when already up to date
    - Failing when branch has diverged
  - Added 4 tests for `pushMainBranch()`:
    - Error when main branch cannot be detected
    - Pushing successfully
    - Reporting no changes when already up to date
    - Failing when push is rejected
- `tests/unit/post-execution-picker.test.ts`:
  - Updated worktree mock to include `pullMainBranch`, `pushMainBranch`, and `detectMainBranch`

## Acceptance Criteria Verification
- [x] Main branch is pulled from remote before worktree creation (when `syncMainBranch: true`)
- [x] Main branch is pushed to remote before PR creation (when `syncMainBranch: true`)
- [x] Main branch name is auto-detected from `origin/HEAD`
- [x] `syncMainBranch: false` skips both operations
- [x] Failures in push/pull produce warnings but don't block the workflow
- [x] Config validation accepts the new key
- [x] Config docs updated

## Notes
- The pre-existing test failures in `claude-runner-interactive.test.ts` and `validation.test.ts` are unrelated to this change - they concern model resolution expecting short aliases but receiving full model IDs
- When not on the main branch, the pull uses `git fetch origin main:main` which directly updates the local ref without checking out the branch, avoiding disruption to the user's current work
- When on the main branch, uncommitted changes will block the pull to prevent data loss
- The push operation is simple and will fail gracefully if the local main has diverged from remote (requires manual resolution)

<promise>COMPLETE</promise>
