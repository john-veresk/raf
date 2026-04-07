# Outcome: Rewrite amend prompt to match principle-driven planning prompt

## Summary

Rewrote `src/prompts/amend.ts` to compose from `src/prompts/shared.ts` and follow the same principle-driven, lean shape as the rewritten planning prompt. Rewrote tests to serve as a spec for the new prompt.

## Key Changes

- **`src/prompts/amend.ts`** — Now imports `PLANNING_PRINCIPLES`, `PLAN_TEMPLATE`, `FLOW`, `DEPENDENCY_RULES` from `./shared.js` and assembles a concise systemPrompt with the same four workflow sections as planning (Explore, Interview, Create Plans, Confirm). Amendment-specific content preserved: existing-tasks summary with status/modifiability markers, protected/modifiable task lists, nextTaskNumber, amendment mode rules, amendment-specific exploration directive (input.md, decisions.md, outcome/plan files). The critique step explicitly checks PROTECTED task boundaries. SystemPrompt reduced from ~135 lines to ~85 lines (~37% shorter).
- **`tests/unit/amend-prompt.test.ts`** — Rewrote from 7 tests to 25 tests organized into describe blocks: basic API, seven retro principles (parameterized), amendment-specific context (markers, protected/modifiable distinction, next task number, PROTECTED boundaries critique), condensed flow, minimum-viable template, exploration/interview directives. Added a failed task to test data for better coverage.

## Notes

- `getAmendPrompt` public API (`AmendPromptParams`, `AmendPromptResult`) is unchanged; callers unaffected.
- Build (`tsc`) passes. Amend-prompt tests pass (25/25). Planning-prompt tests pass (18/18). Pre-existing test failures in other suites are unrelated.

<promise>COMPLETE</promise>
