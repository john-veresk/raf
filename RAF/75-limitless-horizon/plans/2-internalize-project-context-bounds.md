---
effort: medium
---
# Task: Internalize Project Context Bounds

## Objective
Replace user-configurable `context.md` rendering limits with an internal safety policy that keeps RAF resilient to model context overflow.

## Requirements
- Remove the runtime dependency on `getResolvedConfig().context` from `src/core/project-context.ts`.
- Introduce private, non-user-configurable guardrails for project-context generation so RAF no longer exposes section-count or char-count knobs in config.
- Preserve the existing lifecycle guarantees: edited `## Goal` text survives refreshes, decisions are deduplicated, completed/pending work is still derived from plans and outcomes, and recent outcome references are still surfaced when possible.
- Prefer a total-output safety strategy over six user-visible section knobs so the generator can stay “limitless” from the user’s perspective while still avoiding provider failures.
- Make any internally omitted content explicit enough that `context.md` remains trustworthy when large projects exceed the safety budget.

## Key Decisions
- Internal bounds should live with the project-context generator, not in general config.
- Safety should be driven by the rendered context payload, not by user-managed per-section numbers.
- When the safety budget forces omission, keep `Goal`, `Key Decisions`, and current task state before lower-priority historical detail.

## Acceptance Criteria
- [x] `buildProjectContext()` no longer reads from RAF config.
- [x] Large projects still generate a valid `context.md` without unbounded growth into provider-sized prompts.
- [x] The stored goal-preservation behavior continues to work after the refactor.
- [x] The generated artifact makes it clear when lower-priority history was dropped for safety.

## Dependencies
- 1

## Context
Today `src/core/project-context.ts` slices completed work, pending work, decisions, outcome refs, and summary lengths directly from config. Removing the config surface without replacing that strategy would either break generation or make prompt size unpredictable.

## Implementation Steps
1. Define a private rendering-budget strategy in `src/core/project-context.ts` for section summaries and overall output size.
2. Refactor section builders so they emit content in priority order and stop once the internal safety policy says enough context has been retained.
3. Preserve existing summary extraction helpers where they still make sense, but move any remaining truncation constants out of user config.
4. Add a clear marker or note when a section had to be shortened for safety.

## Files to Modify
- `src/core/project-context.ts`
- `src/core/outcome-summary.ts`

## Risks & Mitigations
- An oversized “limitless” context artifact can reintroduce the exact context-overflow failures RAF already detects.
- Mitigation: cap by rendered payload size and prioritize high-signal sections instead of removing all internal bounds.
