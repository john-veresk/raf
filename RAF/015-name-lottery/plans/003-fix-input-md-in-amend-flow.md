# Task: Fix input.md handling in amend flow

## Objective
Change the amend flow to append new task descriptions to input.md (instead of overwriting) and pass only the new input to Claude.

## Context
Currently during `raf plan --amend`, the input.md file handling may overwrite existing content. The correct behavior should be:
1. Append new task descriptions to input.md with a horizontal rule separator
2. Pass only the NEW task description to Claude (not the full input.md history)

This preserves the complete project history in input.md while giving Claude only the relevant new information.

## Requirements
- Append new task descriptions to input.md with `---` separator
- Pass only `newTaskDescription` to Claude in the amend prompt (not original input)
- Preserve the original input.md content
- Format: original content, then `---`, then new content

## Implementation Steps
1. Read `src/commands/plan.ts`, specifically `runAmendCommand()` (lines 210-378)
2. After getting the new task description (around line 303-310):
   - Read the existing input.md content
   - Append a horizontal rule (`---`) and the new task description
   - Write the combined content back to input.md
3. Review `src/prompts/amend.ts` `getAmendPrompt()`:
   - Ensure only `newTaskDescription` is passed in the user message (currently correct at line 188-192)
   - The `inputContent` param may not be needed in the user message if Claude reads input.md directly
4. Add/update tests for the amend flow

## Acceptance Criteria
- [ ] New task descriptions are appended to input.md (not overwriting)
- [ ] Horizontal rule (`---`) separates original from new content
- [ ] Claude receives only the new task description in the user message
- [ ] Original input.md content is preserved
- [ ] Multiple amend operations append correctly (each with separator)
- [ ] Tests cover the append behavior

## Notes
- File locations:
  - `src/commands/plan.ts` - amend command logic
  - `src/prompts/amend.ts` - amend prompt generation
  - `src/core/project-manager.ts` - may have utility for saving input
- The amend prompt system message already instructs Claude to read input.md for context
- Consider using `fs.appendFileSync` or reading/writing the full file
