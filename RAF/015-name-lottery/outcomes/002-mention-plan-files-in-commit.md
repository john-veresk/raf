# Outcome: Mention plan files in git commit instructions

## Summary

Updated the task execution prompt to explicitly mention that plan files should be included in git commits.

## Changes Made

### Modified Files

1. **src/prompts/execution.ts** (line 95)
   - Added a sub-bullet under the `git add -A` instruction
   - New text: "This includes any new plan files in the `plans/` folder"
   - Keeps the instruction concise and integrated with existing commit flow

## Acceptance Criteria Verified

- [x] Git Instructions section mentions plan files
- [x] Instruction is clear and concise
- [x] Does not break existing prompt structure (TypeScript compiles)
- [x] Execution prompt unit tests pass (43 tests)

<promise>COMPLETE</promise>
