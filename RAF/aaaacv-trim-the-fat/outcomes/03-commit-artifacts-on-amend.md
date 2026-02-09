# Outcome: Commit Planning Artifacts (Including Plan Files) on Amend

## Summary

Extended `commitPlanningArtifacts()` to support amending by accepting additional file paths and an `isAmend` flag. The amend flow in `plan.ts` now passes new plan file paths to the commit function, and uses a distinct `Amend:` commit message prefix. Also fixed a bug where `isGitRepo()` was not receiving the `cwd` option for worktree support.

## Key Changes

### `src/core/git.ts`
- Extended `commitPlanningArtifacts()` options to include `additionalFiles?: string[]` and `isAmend?: boolean`
- When `isAmend` is true, commit message uses `RAF[NNN] Amend: project-name` instead of `RAF[NNN] Plan: project-name`
- Additional files are staged alongside `input.md` and `decisions.md`
- Fixed bug: `isGitRepo()` now receives `execCwd` parameter for correct worktree support (was called without `cwd` previously)

### `src/commands/plan.ts`
- Updated `runAmendCommand()` to build full paths for new plan files (`newPlanPaths = newPlanFiles.map(f => path.join(plansDir, f))`)
- Passes `additionalFiles` and `isAmend: true` to `commitPlanningArtifacts()`
- Normal `raf plan` flow unchanged — still only commits input + decisions with "Plan:" prefix

### `tests/unit/commit-planning-artifacts.test.ts`
- Added test: "should use 'Amend:' prefix when isAmend is true"
- Added test: "should stage additional files when provided"
- Added test: "should pass cwd to isGitRepo for worktree support"
- All 11 tests pass (8 existing + 3 new)

## Acceptance Criteria Verification

- [x] `raf plan --amend` commits input.md, decisions.md, and new plan files together
- [x] Amend commits use message format `RAF[NNN] Amend: project-name`
- [x] Normal `raf plan` still uses `RAF[NNN] Plan: project-name` and only commits input + decisions
- [x] Worktree mode works correctly (cwd passed through)
- [x] Tests cover the amend commit scenario (3 new tests)
- [x] All existing tests pass (846 pass, 1 pre-existing failure in planning-prompt.test.ts unrelated)

<promise>COMPLETE</promise>
