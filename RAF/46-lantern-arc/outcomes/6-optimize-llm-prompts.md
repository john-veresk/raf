# Outcome: Optimize LLM prompts for clarity and conciseness

## Summary
Optimized all three prompt files (planning.ts, execution.ts, amend.ts) to remove redundancy, clarify structure, and reduce verbosity while preserving all functional requirements.

## Key Changes Made

### `src/prompts/planning.ts`
- Merged "Step 4: Infer Task Dependencies" into Step 3's plan template section (dependency info was duplicated between the template, Step 4, and Important Rules)
- Consolidated "Important Rules" (9 items) into a compact "Rules" section (3 items) — rules 1,2,5-7,9 were redundant with earlier sections
- Merged "Step 2.5: Record Decisions" into Step 2 (Interview)
- Removed "Your Goals" section (duplicated the role description)
- Tightened Step 1 task identification guidance

### `src/prompts/execution.ts`
- Removed "Important Rules" section (8 items) — all were redundant with Steps 1-4 and Git Instructions
- Removed "Error Handling" section — content merged into Step 2 and Step 4
- Consolidated two "CRITICAL" callouts in Step 4 into streamlined outcome instructions
- Simplified Step 2 guidelines (removed redundant "Add appropriate error handling")
- Merged success/failure commit workflow into Step 4's marker section

### `src/prompts/amend.ts`
- Removed "Important Rules" (10 items) — rules 1-2 duplicated Amendment Mode, 7-8 duplicated template, 10 duplicated Frontmatter Requirements
- Consolidated into compact "Rules" section (4 items)
- Shortened section headings ("Protected Tasks (COMPLETED - cannot be modified)" → "Protected (COMPLETED)")
- Merged "Step 3.5: Record Decisions" into Step 3
- Tightened Step 2 follow-up task instructions

### Test Updates
- `tests/unit/planning-prompt.test.ts`: Updated string assertions to match new prompt wording
- `tests/unit/execution-prompt.test.ts`: Updated assertions for removed/consolidated sections
- `tests/unit/plan-command.test.ts`: Updated amend prompt assertions for shortened headings and wording

## Verification
- TypeScript build passes
- All prompt-related tests pass (85 + 40 + 7 = 132 tests)
- All functional requirements preserved — no behavioral changes

<promise>COMPLETE</promise>
