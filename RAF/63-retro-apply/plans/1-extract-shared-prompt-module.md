---
effort: low
---
# Task: Extract shared prompt module

## Objective
Create `src/prompts/shared.ts` exporting the common principles, minimum-viable plan template, and condensed flow strings that both planning and amend prompts will compose.

## Context
Planning and amend prompts duplicate ~60% of their text (exploration guidance, interview rules, plan template, critique loop). A retro surfaced that those shared sections also need new first-class principles (verify premise, trace lifecycle, prefer existing knobs, lean-first draft, architecture-before-tactics, plans-aren't-essays, reconcile-don't-ratify). One source of truth makes future tweaks apply to both commands at once.

## Requirements
- Export `PLANNING_PRINCIPLES`: a short bulleted string containing all seven retro principles as first-class directives. Each bullet should be one or two sentences max — this is the "lean" target.
- Export `PLAN_TEMPLATE`: the minimum-viable plan template markdown. Required sections: frontmatter (`effort`), `## Objective`, `## Requirements`, `## Acceptance Criteria`. Call out that `## Context`, `## Dependencies`, `## Implementation Steps`, `## Files to Modify`, `## Risks & Mitigations`, `## Notes` are optional — the agent adds them only when they add value.
- Export `FLOW`: a single-sentence description of the draft → self-critique → revise → write habit. No numbered sub-steps.
- Export `DEPENDENCY_RULES`: the dependency syntax rules (strictly lower IDs, only direct not transitive, outcome-link format). Both commands use the same rules.
- Strings must be composable — callers assemble their own `systemPrompt` by concatenating these exports with their command-specific sections. No `composePrompt()` helper, no templating — just exported string constants.
- No runtime behavior, no new dependencies, no changes to existing callers in this task.

## Acceptance Criteria
- [ ] `src/prompts/shared.ts` exists with the four string exports listed above
- [ ] `tsc`/build passes
- [ ] Existing tests still pass (this task introduces no callers)
- [ ] Each principle from the retro is present verbatim in `PLANNING_PRINCIPLES` (seven bullets): verify premise, trace lifecycle, prefer existing knobs, lean-first draft, architecture-before-tactics, plans-aren't-essays, reconcile-don't-ratify

## Notes
- Keep the principle bullets punchy. The retro's lesson is that prose recipes fail; principles the agent can apply in judgement calls succeed.
- `PLAN_TEMPLATE` should explicitly tell the agent "use only the sections that add value" so the executor knows the optional sections are truly optional.
- Do not re-export anything from `planning.ts` or `amend.ts` — this module is a supplier, not a facade.
