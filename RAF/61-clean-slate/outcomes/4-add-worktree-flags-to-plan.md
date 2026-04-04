# Outcome: Add --worktree / --no-worktree Flags to raf plan

## Summary

Added `--worktree` and `--no-worktree` CLI flags to `raf plan` for new project creation. These flags override the config `worktree` setting per-invocation. Amend/resume flows are unaffected.

## Changes Made

- **`src/commands/plan.ts`**:
  - Added `worktree?: boolean` to `PlanCommandOptions` interface
  - Added `.option('--worktree', ...)` and `.option('--no-worktree', ...)` to the command definition
  - Passed `options.worktree` to `runPlanCommand` as new `worktreeOverride` parameter
  - Updated `runPlanCommand` signature to accept `worktreeOverride?: boolean`
  - Replaced `const worktreeEnabled = getWorktreeDefault()` with `worktreeOverride !== undefined ? worktreeOverride : getWorktreeDefault()`

## Verification

- `tsc --noEmit` passes with no errors.

<promise>COMPLETE</promise>
