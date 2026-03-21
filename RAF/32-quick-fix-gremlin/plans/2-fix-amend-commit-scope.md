effort: low
---
# Task: Fix amend mode commit to exclude plan files

## Objective
Change the amend commit to only include `input.md` and `decisions.md`, not the new plan files.

## Context
In `raf plan --amend`, the commit includes new plan files alongside `input.md` and `decisions.md`. Plan files should be committed by Claude during task execution instead, matching how initial planning only commits `input.md` and `decisions.md`.

## Requirements
- Remove `additionalFiles: newPlanPaths` from the amend commit call
- Keep the `isAmend: true` flag (commit message should still use "Amend:" prefix)
- Initial planning commit behavior must remain unchanged

## Implementation Steps

1. **Edit `src/commands/plan.ts`** at lines 650-656. Change:
   ```typescript
   // Commit planning artifacts (input.md, decisions.md, and new plan files)
   const newPlanPaths = newPlanFiles.map(f => path.join(plansDir, f));
   await commitPlanningArtifacts(projectPath, {
     cwd: worktreePath ?? undefined,
     additionalFiles: newPlanPaths,
     isAmend: true,
   });
   ```
   To:
   ```typescript
   // Commit planning artifacts (input.md, decisions.md only — plan files committed during execution)
   await commitPlanningArtifacts(projectPath, {
     cwd: worktreePath ?? undefined,
     isAmend: true,
   });
   ```
   Remove the `newPlanPaths` variable as well since it's no longer used.

2. **Update tests** — Check `tests/unit/commit-planning-artifacts.test.ts` and `tests/unit/commit-planning-artifacts-worktree.test.ts` for any amend-specific tests that assert plan files are committed. Update them to verify plan files are NOT included.

## Acceptance Criteria
- [ ] Amend commit only stages `input.md` and `decisions.md`
- [ ] `additionalFiles` is not passed in the amend code path
- [ ] Initial planning commit behavior unchanged
- [ ] Existing tests updated and passing

## Notes
- The `commitPlanningArtifacts` function itself doesn't need changes — just stop passing `additionalFiles` from the amend caller
- The `additionalFiles` parameter on `commitPlanningArtifacts` can remain in the interface for future use
