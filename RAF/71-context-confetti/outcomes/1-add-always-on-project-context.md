## Summary

Replaced RAF's project-wide `decisions.md` flow with a generated `context.md` artifact, moved planning and execution decision capture into plan/outcome files, refreshed shared context during plan/amend/do flows, and finished the task with the full repository test suite green.

## Key Changes

- Added shared project context and outcome-summary modules so `context.md` is rendered from `input.md`, plan decisions, derived task state, and outcome decision updates through one deterministic pipeline.
- Updated planning, amendment, execution, PR, git staging, project creation, and worktree conflict flows to stop reading or staging `decisions.md` and to use `context.md` instead.
- Inlined `context.md` into amend and execution prompts, required `## Decision Updates` in outcomes, and refreshed `context.md` after RAF-managed outcome writes so execution commits stay clean.
- Added config and path helpers for generated context rendering, updated README documentation, and expanded regression coverage for context generation, planning commits, prompt composition, and refreshed cross-task execution context.
- Resolved the verification blocker from the previous attempt by fixing runner/process-kill behavior, restoring cache-token usage plumbing in stream renderers and token tracking, updating rate-limit detection, and aligning worktree/Codex tests with the current behavior.

## Notes

- `npm run lint` passed.
- `npm test -- --runInBand` passed with all 57 suites green.

<promise>COMPLETE</promise>
