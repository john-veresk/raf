---
effort: medium
---
# Task: Rewrite planning prompt as principle-driven and lean

## Objective
Replace `src/prompts/planning.ts`'s recipe-style systemPrompt with a principle-driven, ~50% shorter version that composes strings from `src/prompts/shared.ts`, and update the tests to match.

## Context
A retro on a real planning session showed the current prompt let the agent write a 7-file plan against an unverified premise — the code already had the knob the task was "adding". The new prompt must teach principles (verify premise, trace lifecycle, prefer existing knobs, lean-first draft, architecture-before-tactics, plans-aren't-essays, reconcile-don't-ratify) instead of a rigid Step 0→4 recipe, and trust the agent's discovery strengths rather than prescribing form.

## Dependencies
1

## Requirements
- Import `PLANNING_PRINCIPLES`, `PLAN_TEMPLATE`, `FLOW`, `DEPENDENCY_RULES` from `./shared.js` and assemble the systemPrompt from them.
- Preserve the public API: `PlanningPromptParams`, `PlanningPromptResult`, `getPlanningPrompt(params)` must keep the same shape and return `{ systemPrompt, userMessage }`.
- Preserve `${projectPath}` interpolations for `decisions.md`, `plans/`, and the example task filename (`1-task-name.md`).
- Preserve the `userMessage` format (references the project description; prompts the LLM to start the planning interview).
- Target: the systemPrompt should be ~50% shorter than today (currently ~128 lines). Principles are short bullets; no multi-paragraph explanations.
- The interview step must explicitly direct the agent to ask architectural/foundational questions first (current state, baked-in vs rendered vs validated, etc.) and tactical questions only after.
- The draft → self-critique → revise → write loop must be expressed as one sentence — not a numbered 4-step block.
- The exploration step must explicitly call out lifecycle tracing (creation → storage → consumption) alongside "find files to modify".
- The prompt must tell the agent to reconcile contradictions between task description and code with the user BEFORE planning any changes.
- Rewrite `tests/unit/planning-prompt.test.ts` assertions to match the new prompt. The tests become a spec for the new prompts: assert the seven principles are present, the condensed flow is present, the minimum-viable template structure is present, and the key interpolations still work (`projectPath`, decisions path, plans path, project description in user message).
- Drop assertions that check obsolete phrases (e.g. `Identify and Order Tasks`, `10-30 minutes`, `Do not skip this step`, `Identify distinct tasks`, `independently completable`, `kebab-case`) unless the new prompt happens to use them verbatim.
- Run `npm test` (or the project's test command) and ensure every test file passes, not just `planning-prompt.test.ts`.

## Acceptance Criteria
- [ ] `src/prompts/planning.ts` imports from `./shared.js` and composes the systemPrompt from the shared strings
- [ ] `getPlanningPrompt` signature and return type unchanged
- [ ] systemPrompt length is ≤ ~65 lines (rough target; clarity wins over a strict count)
- [ ] All seven retro principles are discoverable as first-class bullets in the systemPrompt
- [ ] `tests/unit/planning-prompt.test.ts` is rewritten and passes
- [ ] `npm test` passes for the whole project — no other test file regresses
- [ ] `tsc`/build passes

## Notes
- Verify upstream callers of `getPlanningPrompt` before landing — only the shape of `{ systemPrompt, userMessage }` and the `PlanningPromptParams` fields are contract. Copy changes inside the strings are fair game.
- Do not add backward-compat shims for removed phrases. The retro explicitly warns against plans-as-essays; the prompt should practice what it preaches.
- If the new prompt drops `worktreeMode` handling entirely (the current file already ignores it), leave the param in `PlanningPromptParams` so existing call sites don't break — the field is harmless.
