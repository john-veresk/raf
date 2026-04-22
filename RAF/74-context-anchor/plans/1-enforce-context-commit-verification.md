---
effort: medium
---
# Task: Enforce Context Commit Verification

## Objective
Make `raf do` treat a task as successful only when the task commit includes the refreshed `context.md` alongside the outcome file.

## Requirements
- Preserve the current planning/amend commit flow; do not add planning-prompt work for this bug.
- Trace the successful-task lifecycle from outcome marker detection through `refreshProjectContext()` and commit verification, then enforce the guarantee at the runtime boundary rather than in prompt text.
- Replace the current "file exists in HEAD" check with verification that the task's final RAF commit actually touched all required generated artifacts for that task.
- Require successful task commits to include both the task outcome file and the project `context.md`.
- Surface missing required commit artifacts as a retryable execution failure in `raf do` instead of treating `<promise>COMPLETE</promise>` alone as success.
- Keep worktree cleanup and merge/PR behavior unchanged except that they must now run only after the stricter commit verification passes.
- Add regression coverage for both Claude and Codex execution paths and for the git-level helper(s) used to verify the committed files.

## Key Decisions
- Planning scope is intentionally unchanged: `src/commands/plan.ts` already calls `commitPlanningArtifacts()`, which stages and commits `input.md`, `context.md`, and plan files after planning/amend sessions.
- The fix is runtime enforcement, not a prompt-only change. `src/prompts/execution.ts` already instructs the executor to `git add` `context.md`; the bug is that RAF currently accepts success without proving that happened.
- If a task writes a `COMPLETE` marker but the final task commit omits `context.md`, RAF should fail/retry the task instead of auto-creating a follow-up commit.

## Acceptance Criteria
- [ ] A task run is not considered successful unless the verified RAF task commit touched both the task outcome file and `context.md`.
- [ ] A task that emits `COMPLETE` but omits `context.md` is classified as a retryable failure by `raf do`.
- [ ] The stricter verification applies to both Claude and Codex non-interactive execution paths.
- [ ] Planning/amend behavior remains unchanged: planning artifacts are still committed by RAF code, with no new planner-side prompt dependency.
- [ ] Regression tests cover the new commit-verification helper behavior and the runner/do-path handling for missing `context.md`.

## Context
`context.md` is refreshed during execution via the outcome-marker callback in `src/commands/do.ts`, which means every successful task can leave a dirty generated context file before the task-side commit lands. Today `src/core/completion-detector.ts` only proves that HEAD changed, the commit message prefix matches, and the outcome file exists somewhere in HEAD. That allows `raf do` to accept success even when the latest task commit omitted the freshly rewritten `context.md`, which then blocks worktree cleanup with a dirty tree.

## Implementation Steps
1. Replace the current single-file commit-verification contract in `src/core/completion-detector.ts` and `src/core/runner-types.ts` with a required-artifacts shape that can validate all files that must be part of the task commit.
2. Add or adapt git helper logic in `src/core/git.ts` so verification checks whether the latest RAF task commit touched the required files, not merely whether those paths exist in the HEAD tree.
3. Update `src/commands/do.ts` to pass both the outcome file path and the project `context.md` path into commit verification, and treat commit-verification failure as a retryable task failure.
4. Keep the existing completion-marker/grace-period flow, but ensure the failure state from unmet commit verification survives back into the runner result that `raf do` interprets.
5. Extend unit coverage in the runner and git helper suites to cover success, missing-context failure, and the unchanged planning commit path assumptions.

## Files to Modify
- `src/core/completion-detector.ts`
- `src/core/runner-types.ts`
- `src/core/git.ts`
- `src/commands/do.ts`
- `tests/unit/claude-runner.test.ts`
- `tests/unit/codex-runner.test.ts`
- `tests/unit/git-commit-helpers.test.ts`

## Risks & Mitigations
- Existing verification is weaker than it looks because "file exists in HEAD" does not prove the latest task commit staged that file.
  Mitigation: verify the latest RAF task commit touched the required artifact paths.
- Tightening success criteria can turn previously "successful" runs into retries.
  Mitigation: keep the failure retryable and cover both runners with focused regression tests so the behavior is intentional and stable.

## Notes
- `context.md` should be treated as a required generated artifact for every successful task because `refreshProjectContext()` runs when the outcome file gains its completion marker.
