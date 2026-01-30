# Task: Remove Editor Placeholder Text

## Objective
Open the editor with an empty file instead of placeholder text "Describe your project here..." during the plan phase.

## Context
Currently, when running `raf plan`, the editor opens with placeholder text that the user must delete before writing their project description. Opening with an empty file provides a cleaner experience.

## Requirements
- Editor opens with completely empty file (no placeholder text)
- No template, hints, or comments in the file
- User starts with a blank canvas
- Works with all supported editors ($EDITOR)

## Implementation Steps
1. Locate the editor template in `src/core/editor.ts` or `src/commands/plan.ts`
2. Find where the initial content/template is defined
3. Remove or comment out the placeholder text
4. Ensure the file is created but with empty content (`''`)
5. Test with different editors to ensure empty file works

## Acceptance Criteria
- [ ] `raf plan` opens editor with empty file
- [ ] No placeholder text present
- [ ] No template or comments
- [ ] Works with vim, nano, code, and other common editors
- [ ] All tests pass

## Notes
- This is a simple change - just remove the template content
- The placeholder text is likely defined as a string constant somewhere
- Make sure the file is still created (just empty)
- User experience is cleaner without needing to delete boilerplate
- If there were useful hints, they could be shown in terminal before editor opens instead
