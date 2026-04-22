## Summary

Reworked RAF's project-context generator to use an internal rendered-payload budget instead of fixed user-facing section caps. The generator now keeps goal, decisions, current state, pending work, completed history, and source references in priority order while explicitly calling out omitted historical detail when large projects exceed the safety budget.

## Key Changes

- Updated `src/core/project-context.ts` to render `context.md` against a private total-size policy, prioritize current project state over older history, and add per-section omission notes when safety truncation is required.
- Extended `src/core/outcome-summary.ts` with summary truncation metadata so completed-work entries can stay bounded without silently hiding shortened summaries.
- Added regression coverage in `tests/unit/project-context.test.ts` for oversized projects, bounded output length, preserved goal refresh behavior, and explicit safety markers.
- Marked the task acceptance criteria complete in `plans/2-internalize-project-context-bounds.md` so the task record matches the implementation.

## Decision Updates

None.

## Notes

- Verification passed with `npm run lint`.
- Verification passed with `npm test -- --runInBand tests/unit/project-context.test.ts tests/unit/pull-request.test.ts tests/unit/execution-prompt.test.ts`.
- I left the pre-existing worktree changes in `context.md` and `outcomes/1-remove-context-config-surface.md` untouched.

<promise>COMPLETE</promise>
