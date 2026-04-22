# Outcome

## Summary

Preserved editable `## Goal` content in `context.md` across refreshes, while keeping `input.md` as the raw prompt/history source used only for initial goal bootstrapping when no stored goal exists.

## Key Changes

- Updated `src/core/project-context.ts` so refreshes preserve an existing `## Goal` and only fall back to `input.md` for legacy or brand-new projects without stored goal text.
- Updated planning and amend prompt instructions so the planner maintains `context.md`'s `## Goal` as a clarified summary and revises it when scope materially changes.
- Updated README semantics and added regression tests covering preserved-goal refresh behavior, fallback bootstrapping, and the new prompt wording.

## Decision Updates

- None.

## Notes

- Verification passed with `npm test -- --runTestsByPath tests/unit/project-context.test.ts tests/unit/planning-prompt.test.ts tests/unit/amend-prompt.test.ts` and `npm run lint`.

<promise>COMPLETE</promise>
