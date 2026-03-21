# Outcome: Commit Amended Changes When No New Plans Are Created

## Summary
Fixed the amend flow to always attempt committing after a successful Claude session, regardless of whether new plan files were created. Previously, commits were skipped when no new plans were added, even if decisions.md, input.md, or existing plan files were modified.

## Key Changes

### Source files modified:
- **`src/commands/plan.ts`** (lines 629-655) — Restructured the post-session logic in `runAmendCommand()`:
  - Moved `commitPlanningArtifacts()` call outside the `newPlanFiles.length > 0` conditional block
  - Changed `additionalFiles` from only new plan files to ALL plan files (so modifications to existing plans are staged)
  - The existing `git diff --cached` check in `commitPlanningArtifacts()` naturally prevents empty commits when nothing changed

## Acceptance Criteria Verification
- [x] `raf plan --amend` commits when decisions.md is updated but no new plans created — `commitPlanningArtifacts` always stages decisions.md and calls commit
- [x] `raf plan --amend` commits when existing plan files are modified but no new plans created — all plan files are now staged via `allPlanAbsolutePaths`
- [x] `raf plan --amend` commits when input.md is updated but no new plans created — `commitPlanningArtifacts` always stages input.md
- [x] `raf plan --amend` does NOT create an empty commit when nothing changed — `commitPlanningArtifacts` checks `git diff --cached` before committing
- [x] `raf plan --amend` still commits normally when new plan files ARE created — all plan files are staged regardless
- [x] Commit message uses 'Amend' format in all cases — `isAmend: true` is always passed
- [x] All tests pass (1239/1240 — 1 pre-existing failure in name-generator.test.ts unrelated to this change)

<promise>COMPLETE</promise>
