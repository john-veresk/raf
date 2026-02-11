# Outcome: Sync worktree branch with main before execution

## Summary
Successfully implemented automatic rebasing of worktree branches onto the latest main branch before task execution in `raf do`. This ensures worktree branches are up-to-date, reducing merge conflicts later.

## Changes Made

### 1. Added `RebaseResult` interface and `rebaseOntoMain` function to `src/core/worktree.ts`

**New interface** (line 444-447):
- `RebaseResult` with `success: boolean` and `error?: string`

**New function `rebaseOntoMain`** (lines 668-695):
- Takes `mainBranch` (branch name) and `cwd` (worktree directory) as parameters
- Executes `git rebase ${mainBranch}` in the specified directory
- On rebase failure (e.g., conflicts):
  - Automatically runs `git rebase --abort` to restore clean state
  - Returns `success: false` with error message
  - Gracefully ignores abort errors if abort itself fails
- Returns `success: true` on successful rebase

### 2. Updated `src/commands/do.ts`

**Added imports** (lines 55-56):
- `detectMainBranch` and `rebaseOntoMain` from `../core/worktree.js`

**Stored main branch name** (lines 228, 246):
- Added `mainBranchName` variable to capture the main branch from `pullMainBranch()` sync result
- Falls back to `detectMainBranch()` if sync was disabled or failed

**Added rebase step** (lines 468-479):
- After post-execution action picker but before task execution
- Only runs when:
  - In worktree mode (`worktreeMode && worktreeRoot`)
  - `syncMainBranch` config setting is enabled
  - Main branch can be detected
- On success: logs `"Rebased onto ${mainBranch}"`
- On failure: logs warning with error message and `"Continuing with current branch state."`
- Execution continues regardless of rebase outcome (soft failure)

### 3. Added tests to `tests/unit/worktree.test.ts`

**Added `rebaseOntoMain` to imports** (line 49)

**Added test suite for `rebaseOntoMain`** (lines 809-857):

1. **"should successfully rebase onto main branch"**:
   - Mocks successful `git rebase main` execution
   - Verifies `success: true` and no error
   - Confirms git command called with correct `cwd`

2. **"should abort rebase and return failure on conflict"**:
   - Mocks rebase failure with "CONFLICT" error
   - Verifies `success: false` with error message
   - Confirms both `git rebase main` and `git rebase --abort` are called
   - Ensures abort is called with correct `cwd`

3. **"should handle rebase abort failure gracefully"**:
   - Mocks both rebase and abort failures
   - Verifies function still returns `success: false` even when abort fails
   - Ensures abort errors don't crash the function

### 4. Updated test mock in `tests/unit/post-execution-picker.test.ts`

**Added `rebaseOntoMain`** (line 68):
- Added to the worktree module mock to prevent import errors

## Key Features

1. **Automatic sync**: Worktree branches are rebased onto main before each execution, keeping them current
2. **Conflict handling**: On rebase conflicts, automatically aborts and continues with a warning
3. **Config-driven**: Respects `syncMainBranch` config setting (skips when disabled)
4. **Main branch detection**: Uses cached main branch from sync step, falls back to detection
5. **Clean state**: On conflict, `git rebase --abort` ensures worktree is left in a usable state
6. **Soft failure**: Rebase failures are warnings, not errors - execution continues
7. **Worktree-only**: Rebase only happens in worktree mode, not in standard mode

## Testing

- All 1290 tests pass (78 worktree tests including 3 new rebase tests)
- TypeScript compilation successful with no errors
- Test coverage includes:
  - Successful rebase scenario
  - Conflict scenario with automatic abort
  - Abort failure graceful handling

## Acceptance Criteria

- ✅ Worktree branch is rebased onto main before task execution
- ✅ Conflicts cause rebase abort + warning, execution continues
- ✅ Rebase only happens in worktree mode
- ✅ Respects `syncMainBranch` config setting
- ✅ Main branch name correctly determined from sync result or detection
- ✅ Tests pass

<promise>COMPLETE</promise>
