# Project Decisions

## Which overall rewrite shape do you want for the planning/amend prompts?
Principle-driven rewrite — replace the Step 0→4 recipe with a short principles list + leaner flow, drop rigid template sections, trust agent judgement.

## Should the shared instructions (exploration, interview, plan template, critique loop) be extracted into a common module?
Yes, extract to `src/prompts/shared.ts`. Planning and amend import shared strings. One source of truth.

## How should existing tests be handled?
Rewrite tests to match new prompts. Update assertions to check the new principles/structure. Tests become a spec for the new prompts.

## How flexible should the plan file template be in the new prompts?
Minimum viable: Objective, Requirements, Acceptance Criteria. Drop Context/Dependencies/Implementation Steps/Files to Modify/Risks/Notes as required. Agent adds what it judges useful.

## Which retro principles must land as first-class directives? (group A)
Verify premises against code; Trace lifecycle (create→store→consume); Prefer existing knobs; Lean-first draft (blast-radius cap).

## Which additional retro principles must land? (group B)
Architecture before tactics in interview; Plans aren't essays; Reconcile, don't ratify. (Dropped: explicit shared/core/CLI directive — covered implicitly by lifecycle tracing.)

## How aggressive should the prompt length reduction be?
Aggressive: ~50% shorter. Target ~60-70 lines for planning systemPrompt. Principles as short bullets, minimal prose.

## For the critique loop (draft→self-critique→revise→write), what should happen?
Keep, but condense to one line. Preserve the draft→critique→revise habit but collapse from a 4-step numbered loop to one sentence.
