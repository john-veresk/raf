---
effort: medium
---
# Task: Rewrite amend prompt to match the principle-driven planning prompt

## Objective
Rewrite `src/prompts/amend.ts` to compose from `src/prompts/shared.ts` and follow the same principle-driven, lean shape as the rewritten planning prompt, preserving the amendment-specific semantics (protected vs modifiable tasks, existing-task summary, next task number), and update the tests to match.

## Context
Today `amend.ts` duplicates most of `planning.ts`'s recipe-style systemPrompt and adds amendment-specific scaffolding on top. After task 2 lands, `planning.ts` will be principle-driven and lean; `amend.ts` must follow the same shape so both commands stay in sync and future prompt changes apply to both via `shared.ts`.

## Dependencies
1, 2

## Requirements
- Import the same shared strings as `planning.ts` (`PLANNING_PRINCIPLES`, `PLAN_TEMPLATE`, `FLOW`, `DEPENDENCY_RULES`) from `./shared.js` and compose the systemPrompt from them.
- Preserve the public API: `AmendPromptParams`, `AmendPromptResult`, `getAmendPrompt(params)` keep their shapes and return `{ systemPrompt, userMessage }`.
- Preserve amendment-specific content that cannot live in `shared.ts`:
  - The existing-tasks summary with `[COMPLETED]`/`[PENDING]`/`[FAILED]` and `[PROTECTED]`/`[MODIFIABLE]` markers.
  - The separate `### Protected (COMPLETED)` and `### Modifiable (PENDING/FAILED)` lists.
  - The `nextTaskNumber` guidance for new task numbering.
  - The amendment mode rules (never modify PROTECTED tasks, never renumber, may modify MODIFIABLE if requested).
  - The amendment-specific exploration directive to also read `input.md`, `decisions.md`, and outcome files for PROTECTED tasks / plan files for MODIFIABLE tasks — as part of the same first-pass exploration.
- Apply the retro principles to the amend flow as well: the agent must verify premises for any claimed behaviour of completed work against the outcome files, and reconcile contradictions with the user before drafting new plans.
- Target ~50% shorter than today (currently ~203 lines). Principles as bullets; no multi-paragraph recipe.
- Draft → self-critique → revise → write loop expressed as one sentence, carrying the amendment-specific note that the critique must check PROTECTED task boundaries.
- Rewrite `tests/unit/amend-prompt.test.ts` to match the new prompt: assert the seven principles are present, the amendment-specific context (existing task markers, protected/modifiable distinction, next task number) is present, the minimum-viable plan template is present, and the key interpolations still work.
- Drop assertions that check obsolete phrases unless they happen to remain verbatim.
- Run `npm test` and ensure the whole project's test suite passes.

## Acceptance Criteria
- [ ] `src/prompts/amend.ts` imports from `./shared.js` and composes the systemPrompt from the shared strings
- [ ] `getAmendPrompt` signature and return type unchanged
- [ ] systemPrompt length is ≤ ~100 lines (rough target; amendment context legitimately adds some lines beyond planning)
- [ ] All seven retro principles are discoverable as first-class bullets in the systemPrompt
- [ ] `[COMPLETED]`, `[PENDING]`, `[FAILED]`, `[PROTECTED]`, `[MODIFIABLE]` markers still render in the existing-tasks summary
- [ ] Amendment mode rules (never modify PROTECTED, never renumber, new tasks start at `nextTaskNumber`) are explicit in the prompt
- [ ] `tests/unit/amend-prompt.test.ts` is rewritten and passes
- [ ] `npm test` passes for the whole project — no other test file regresses
- [ ] `tsc`/build passes

## Notes
- Verify upstream callers of `getAmendPrompt` before landing — the contract is `{ systemPrompt, userMessage }` plus the `AmendPromptParams` fields. Copy inside strings is fair game.
- The amendment-specific exploration directive should be a short addition to (not a replacement for) the shared exploration guidance. One or two sentences telling the agent what extra files to read in the same parallel batch.
- Do not introduce a `composeSystemPrompt(mode)` helper that unifies planning and amend. Keep `planning.ts` and `amend.ts` as independent composers of shared strings — simpler to reason about and matches the "less rigidity" goal.
