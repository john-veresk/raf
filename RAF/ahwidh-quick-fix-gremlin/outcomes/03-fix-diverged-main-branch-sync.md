# Outcome: Fix diverged main branch sync to report failure

## Summary
Successfully changed `pullMainBranch()` to return `success: false` when the local main branch has diverged from remote, ensuring callers surface the issue as a warning instead of silently ignoring it.

## Changes Made

### 1. Updated `src/core/worktree.ts` (line 534)
- **Before**: `success: true` when local main has diverged from remote
- **After**: `success: false` when local main has diverged from remote
- The plain `git fetch origin main` still runs successfully, updating the remote ref
- The error message remains: `"Local ${mainBranch} has diverged from origin, not updated"`

### 2. Updated `tests/unit/worktree.test.ts` (line 732)
- **Test**: "should warn when local main has diverged"
- **Before**: `expect(result.success).toBe(true)`
- **After**: `expect(result.success).toBe(false)`
- All 75 worktree tests pass

## Key Improvements
- Diverged branch scenarios are now properly surfaced to callers
- Callers already had `if (!syncResult.success) { logger.warn(...) }` pattern in place (lines 243-250 in do.ts and similar in plan.ts)
- Users will now see a warning when their local main has diverged, instead of proceeding silently on a stale base ref
- Execution continues after the warning (soft failure), not a hard error

## Acceptance Criteria
- ✅ Diverged branch path returns `success: false`
- ✅ Callers show a warning via `logger.warn()` (already handled)
- ✅ Execution continues after the warning (callers don't abort)
- ✅ Tests updated and passing (75/75 tests pass)

<promise>COMPLETE</promise>
