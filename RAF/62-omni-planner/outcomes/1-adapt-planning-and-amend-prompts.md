# Outcome: Adapt planning.ts and amend.ts with ultraplan workflow

## Summary

Rewrote the `systemPrompt` template literals in both `src/prompts/planning.ts` and `src/prompts/amend.ts` to incorporate ultraplan-style multi-agent codebase exploration (Step 0), a per-task draft-critique-revise-write loop, and two new optional plan-file sections (`## Files to Modify` and `## Risks & Mitigations`).

## Key Changes

### `src/prompts/planning.ts`
- Added **Step 0: Explore the Codebase** with three parallel exploration angles in harness-agnostic language
- Updated Step 1 to reference "the synthesis from Step 0"
- Added "Ground your questions in the exploration findings" sentence to Step 2
- Restructured Step 3 with the four-phase loop: Draft -> Self-critique -> Revise -> Write
- Added `## Files to Modify` and `## Risks & Mitigations` optional sections to the plan-file template

### `src/prompts/amend.ts`
- Replaced "Step 1: Read Context" with **Step 0: Explore the Codebase & Existing Project** — same three angles plus amendment-specific reads (input.md, decisions.md, PROTECTED outcomes, MODIFIABLE plans)
- Step 0 ends with "PROTECTED outcomes are immutable" reminder
- Renumbered steps: Step 0 Explore -> Step 1 Analyze -> Step 2 Interview -> Step 3 Create Plans -> Step 4 Confirm
- Added "Ground your questions" sentence to Step 2
- Restructured Step 3 with the same critique loop, plus PROTECTED-boundary check in the critique step
- Added same two optional plan-file template sections
- Amendment Mode, Project Location, Existing Tasks, Protected, Modifiable, and Rules blocks are unchanged

### Verification
- `npm run build` passes (no type-level changes — only template literal edits)
- No references to `ExitPlanMode`, `__ULTRAPLAN_TELEPORT_LOCAL__`, or other ultraplan artifacts
- `PlanningPromptParams`, `AmendPromptParams`, and both `userMessage` builders are unchanged
- Step 0 wording and critique loop wording are copy-paste identical between files (only amend-specific additions differ)

<promise>COMPLETE</promise>
