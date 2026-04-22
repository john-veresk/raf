# Outcome: Enforce Context Commit Verification

## Summary

Updated RAF's execution-time commit verification so `raf do` only treats a task as successful when the final RAF task commit touched both the task outcome file and the refreshed project `context.md`.

## Key Changes

- Replaced the weak "file exists in HEAD" check with git helpers that verify the latest commit actually touched every required artifact.
- Expanded commit verification context to carry all required artifact paths plus the git `cwd`, which fixes verification for worktree executions as well as the main repo path.
- Propagated commit-verification failure through both Claude and Codex non-interactive runners so `do` can classify missing `context.md` as a retryable failure instead of a success.
- Added regression coverage for the git helper, both runners, and the `do`-layer failure reason handling.

## Decision Updates

- None.

## Notes

- Planning and amend flows were left unchanged. `commitPlanningArtifacts()` still owns planning-side commits.
- Verification run:
  `npm run lint`
  `npm test -- --runTestsByPath tests/unit/git-commit-helpers.test.ts tests/unit/claude-runner.test.ts tests/unit/codex-runner.test.ts tests/unit/do-command.test.ts`

<promise>COMPLETE</promise>
