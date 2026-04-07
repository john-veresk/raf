# Outcome: Extract shared prompt module

## Summary

Created `src/prompts/shared.ts` with four exported string constants that both planning and amend prompts can compose.

## Key Changes

- **New file:** `src/prompts/shared.ts`
  - `PLANNING_PRINCIPLES` — seven retro principles as punchy bulleted directives (verify premise, trace lifecycle, prefer existing knobs, lean-first draft, architecture-before-tactics, plans-aren't-essays, reconcile-don't-ratify)
  - `PLAN_TEMPLATE` — minimum-viable plan template with required sections (frontmatter/effort, Objective, Requirements, Acceptance Criteria) and optional sections explicitly marked as such
  - `FLOW` — single-sentence draft → self-critique → revise → write habit description
  - `DEPENDENCY_RULES` — dependency ID ordering rules, direct-only constraint, and outcome-link format

## Notes

- No existing callers were modified; this task only introduces the module as a supplier
- Build passes; pre-existing test failures (68) are unrelated to this change

<promise>COMPLETE</promise>
