# Task: Commit Planning Artifacts (Including Plan Files) on Amend

## Objective
Ensure that `raf plan --amend` commits input.md, decisions.md, AND plan files — not just input and decisions — using a distinct "Amend" commit message.

## Dependencies
002

## Context
Currently `commitPlanningArtifacts()` in `src/core/git.ts` only stages and commits `input.md` and `decisions.md`. For new plans (`raf plan`), this is fine because Claude commits plan files during execution. But for amendments, the new/updated plan files created during the amend session are never committed by RAF. Additionally, the commit message should distinguish amendments from new plans.

## Requirements
- Modify `commitPlanningArtifacts()` (or create a new function) to optionally accept plan file paths to include in the commit
- The amend flow in `src/commands/plan.ts` (`runAmendCommand()`) should pass the new/modified plan files to the commit function
- Use commit message format `RAF[NNN] Amend: project-name` for amendments (vs existing `RAF[NNN] Plan: project-name` for new plans)
- The normal `raf plan` flow should continue to use the existing behavior (commit only input + decisions with "Plan:" message)
- Support worktree mode (pass `cwd` option through)
- Plan files are in the `plans/` subdirectory of the project path; the amend flow already detects new plan files by checking if their task number >= `nextTaskNumber`

## Implementation Steps
1. Extend `commitPlanningArtifacts()` in `src/core/git.ts` to accept optional additional file paths and an optional commit message override (or an `isAmend` flag that changes the message format)
2. In `runAmendCommand()` in `src/commands/plan.ts`, after detecting new plan files, build their full paths and pass them to `commitPlanningArtifacts()` along with the amend flag
3. The git add command should stage `input.md`, `decisions.md`, and all plan files (new and existing, since existing ones won't have changes and won't affect the commit)
4. Update the existing tests in `tests/unit/commit-planning-artifacts.test.ts` to cover the new parameters
5. Add tests for the amend commit message format

## Acceptance Criteria
- [ ] `raf plan --amend` commits input.md, decisions.md, and new plan files together
- [ ] Amend commits use message format `RAF[NNN] Amend: project-name`
- [ ] Normal `raf plan` still uses `RAF[NNN] Plan: project-name` and only commits input + decisions
- [ ] Worktree mode works correctly (cwd passed through)
- [ ] Tests cover the amend commit scenario
- [ ] All existing tests pass

## Notes
- The amend flow in `plan.ts` already computes `newPlanFiles` (lines 547-553) — these are just filenames like `004-new-task.md`. Build full paths as `path.join(plansDir, filename)`.
- Consider staging the entire `plans/` directory with a glob rather than individual files — simpler and captures any modifications to existing plans too. But be careful not to stage unrelated files.
- `commitPlanningArtifacts()` currently checks `isGitRepo()` without cwd — this should also be fixed to use the cwd option for worktree support (existing bug).
