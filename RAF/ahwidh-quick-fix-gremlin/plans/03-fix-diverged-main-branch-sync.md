effort: low
---
# Task: Fix diverged main branch sync to report failure

## Objective
Change `pullMainBranch()` to return `success: false` when the local main branch has diverged from remote, so callers surface the issue as a warning.

## Context
PR #5 review comment: When `git fetch origin main:main` fails because local main has diverged, the code falls back to `git fetch origin main` and returns `success: true` with an `error` message. Callers only check `success === false` to warn, so the divergence is silently ignored. Worktree/PR flows then proceed on stale base refs.

The fix: return `success: false` so callers show the warning. Per user decision, this should be a visible warning that lets execution continue (not a hard error).

## Requirements
- Change `success: true` to `success: false` in the diverged branch path
- Callers already handle `success: false` with `logger.warn()` — no caller changes needed
- The plain `git fetch origin main` should still run (we still want the remote ref updated)

## Implementation Steps

1. **Edit `src/core/worktree.ts`** at lines 533-538. Change:
   ```typescript
   return {
     success: true,
     mainBranch,
     hadChanges: false,
     error: `Local ${mainBranch} has diverged from origin, not updated`,
   };
   ```
   To:
   ```typescript
   return {
     success: false,
     mainBranch,
     hadChanges: false,
     error: `Local ${mainBranch} has diverged from origin, not updated`,
   };
   ```

2. **Update tests** — Find tests for `pullMainBranch` (likely in `tests/unit/worktree.test.ts`) and update the diverged branch test case to assert `success: false`.

## Acceptance Criteria
- [ ] Diverged branch path returns `success: false`
- [ ] Callers show a warning via `logger.warn()` (already happens for `success: false`)
- [ ] Execution continues after the warning (callers don't abort on sync failure)
- [ ] Tests updated and passing

## Notes
- The second `git fetch origin main` (plain fetch) still runs successfully — it updates `origin/main` remote ref even though local `main` isn't updated. This is fine.
- Callers in `do.ts` (line 243-250) and `plan.ts` already have the pattern: `if (!syncResult.success) { logger.warn(...) }` — no changes needed there.
