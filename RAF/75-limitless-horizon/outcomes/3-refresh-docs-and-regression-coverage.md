# Task 3 - Refresh Docs And Regression Coverage

## Summary

Updated the public docs and regression suite to match RAF's removed `context` config surface and the new internal-only `context.md` safety policy.

## Key Changes

- Updated `README.md` to describe `context.md` as an RAF-managed generated artifact and to explicitly note that `raf config` no longer supports a `context` section.
- Updated `src/prompts/config-docs.md` so the config reference documents the silent legacy-ignore behavior for top-level `context` blocks instead of treating `context` as supported config.
- Extended `tests/unit/config.test.ts` with regression coverage for ignoring legacy `context` blocks while still rejecting unrelated unknown keys and preserving supported sibling settings.
- Tightened `tests/unit/project-context.test.ts` around the internal safety contract by asserting bounded output plus truncation/omission markers for oversized project history.
- Removed stale `getResolvedConfig().context` mocks from `tests/unit/plan-command-codex-resume.test.ts` and `tests/unit/plan-command-auto-flag.test.ts` so those fixtures reflect the current resolved-config shape.
- Marked the acceptance criteria complete in `plans/3-refresh-docs-and-regression-coverage.md`.

## Decision Updates

None.

## Notes

- Verification passed with `npm run lint`.
- Verification passed with `npm test -- --runInBand tests/unit/config.test.ts tests/unit/config-command.test.ts tests/unit/project-context.test.ts tests/unit/plan-command-codex-resume.test.ts tests/unit/plan-command-auto-flag.test.ts`.
- I left the pre-existing worktree changes in `RAF/75-limitless-horizon/context.md` and `RAF/75-limitless-horizon/outcomes/1-remove-context-config-surface.md` untouched.

<promise>COMPLETE</promise>
