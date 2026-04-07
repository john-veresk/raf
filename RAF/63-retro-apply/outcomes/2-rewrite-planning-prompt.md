# Outcome: Rewrite planning prompt as principle-driven and lean

## Summary

Replaced the recipe-style planning prompt (128 lines) with a principle-driven, ~53-line version that composes strings from `src/prompts/shared.ts`. Rewrote tests to serve as a spec for the new prompt.

## Key Changes

- **`src/prompts/planning.ts`** — Removed Step 0–4 recipe structure. Now imports `PLANNING_PRINCIPLES`, `PLAN_TEMPLATE`, `FLOW`, `DEPENDENCY_RULES` from `./shared.js` and assembles a concise systemPrompt with four workflow sections (Explore, Interview, Create Plans, Confirm). Lifecycle tracing, architecture-first questioning, and contradiction reconciliation are explicit directives. The draft→critique→revise→write loop is a single sentence via `FLOW`.
- **`tests/unit/planning-prompt.test.ts`** — Rewrote from 12 tests to 18 tests organized into describe blocks: basic API, seven retro principles (parameterized), condensed flow, minimum-viable template, exploration/interview directives, and backward-compat worktreeMode. Dropped assertions for obsolete phrases (`Identify and Order Tasks`, `10-30 minutes`, `Do not skip this step`, `kebab-case`, etc.).

## Notes

- `getPlanningPrompt` public API (`PlanningPromptParams`, `PlanningPromptResult`) is unchanged; `worktreeMode` param kept but ignored.
- Build (`tsc`) passes. Planning-prompt tests pass (18/18). Pre-existing 67 test failures in other suites are unrelated.

<promise>COMPLETE</promise>
