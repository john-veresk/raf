# Task 1: Add `pushOnComplete` config option

## Summary
Added a configurable `pushOnComplete` boolean that pushes the current branch to remote after successful `raf do` execution, in both worktree and non-worktree modes.

## Key Changes

### `src/types/config.ts`
- Added `pushOnComplete: boolean` to `RafConfig` interface (after `syncMainBranch`)
- Added `pushOnComplete: false` to `DEFAULT_CONFIG`

### `src/utils/config.ts`
- Added `pushOnComplete` to `VALID_TOP_LEVEL_KEYS`
- Added boolean validation for `pushOnComplete`
- Added merge logic in `deepMerge()`
- Added `getPushOnComplete()` getter function

### `src/core/worktree.ts`
- Added `pushCurrentBranch()` helper that pushes whatever branch is currently checked out, reusing `SyncMainBranchResult` type

### `src/commands/do.ts`
- Non-worktree mode: after successful execution, pushes current branch when `pushOnComplete` is enabled
- Worktree merge mode: after successful merge, pushes the merged-into branch when enabled
- Push failures log a warning but don't fail overall execution

## Acceptance Criteria
- [x] `pushOnComplete` field exists in `RafConfig` interface and `DEFAULT_CONFIG` with default `false`
- [x] `raf config set pushOnComplete true` works (via VALID_TOP_LEVEL_KEYS + validation)
- [x] Non-worktree mode: after successful `raf do`, current branch is pushed to origin when enabled
- [x] Worktree merge mode: after successful merge, the merged-into branch is pushed to origin when enabled
- [x] Push failures log a warning but don't fail the overall execution
- [x] No push occurs when execution fails (tasks have errors)
- [x] No push occurs when `pushOnComplete` is `false` (default)

<promise>COMPLETE</promise>
