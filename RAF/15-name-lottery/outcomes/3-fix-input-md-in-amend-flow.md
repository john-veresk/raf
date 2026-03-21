# Outcome: Fix input.md handling in amend flow

## Summary

Modified the amend flow to append new task descriptions to `input.md` with a horizontal rule separator, and removed the unused `inputContent` parameter from the amend prompt.

## Changes Made

### Modified Files

1. **src/commands/plan.ts** (lines 321-326)
   - Added code to append new task description to `input.md` after user input is captured
   - Uses `\n\n---\n\n` as separator between original and new content
   - Handles edge cases: empty original content, whitespace-only content
   - Removed `inputContent: originalInput` from `getAmendPrompt()` call

2. **src/prompts/amend.ts** (line 5)
   - Removed `inputContent: string` from `AmendPromptParams` interface
   - This param was never used in the prompt generation (Claude reads input.md directly)

3. **tests/unit/plan-command.test.ts**
   - Updated all test cases to not pass `inputContent` parameter
   - Fixed formatting issues from replacement

4. **tests/unit/plan-command-amend-input.test.ts** (new file)
   - Added 6 new tests for the input.md append behavior:
     - Appending with separator to existing content
     - Handling empty original input
     - Handling non-existent input.md
     - Multiple amend operations (each with separator)
     - Trailing whitespace handling
     - Whitespace-only content treated as empty

## Acceptance Criteria Verified

- [x] New task descriptions are appended to input.md (not overwriting)
- [x] Horizontal rule (`---`) separates original from new content
- [x] Claude receives only the new task description in the user message
- [x] Original input.md content is preserved
- [x] Multiple amend operations append correctly (each with separator)
- [x] Tests cover the append behavior (6 new tests)
- [x] All existing tests pass (733 tests total)

<promise>COMPLETE</promise>
