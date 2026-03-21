# Task 7: Fix Plan Amend Prompt and Add Numeric ID Resolution

## Summary
Removed the `!autoMode` gate from the existing-project detection check in `runPlanCommand()`, so `raf plan -y <name-or-id>` now correctly detects existing projects and prompts to amend instead of silently creating duplicates.

## Changes Made

### `src/commands/plan.ts`
- Removed `!autoMode` from the condition on line 121: `if (projectName && !autoMode)` → `if (projectName)`
- The existing project detection now runs regardless of `-y` flag
- The interactive prompt (`select()`) intentionally breaks out of auto mode for this safety check
- Numeric ID resolution was already supported by both `resolveProjectIdentifierWithDetails()` and `resolveWorktreeProjectByIdentifier()` — no additional changes needed

## Acceptance Criteria
- [x] `raf plan -y <existing-project-name>` detects the existing project and prompts to amend
- [x] `raf plan -y <numeric-id>` (e.g., `raf plan -y 38`) detects the existing project and prompts to amend
- [x] `raf plan --amend <numeric-id>` resolves the project correctly and enters amend mode
- [x] `raf plan --amend <project-name>` continues to work as before
- [x] Resolution checks both main-repo and worktree projects in all cases
- [x] If user selects "amend", the amend flow runs correctly
- [x] If user selects "create new", a new project is created as before
- [x] Non-auto-mode behavior is unchanged

## Notes
- The fix was a one-line change — the resolution utilities already supported numeric IDs; only the auto-mode guard was preventing the check from running.
- The `select()` prompt intentionally breaks auto mode for this safety check, as silently duplicating a project is almost always a mistake.

<promise>COMPLETE</promise>
