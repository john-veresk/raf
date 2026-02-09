# Task: Remove Co-Authored-By from Commit Messages

## Objective
Prevent Claude from adding "Co-Authored-By" trailers to commit messages during task execution.

## Context
Claude Code's default behavior adds a "Co-Authored-By: Claude..." trailer to git commits. Since RAF instructs Claude to make commits via the execution prompt, an explicit instruction must be added to suppress this. The execution prompt is in `src/prompts/execution.ts`.

## Requirements
- Add an explicit instruction in the Git Instructions section of the execution prompt telling Claude NOT to add Co-Authored-By or any other trailers to commit messages
- The commit message should contain ONLY the `RAF[project:task] description` format, nothing else
- Update the existing tests for the execution prompt to verify the new instruction is present

## Implementation Steps
1. In `src/prompts/execution.ts`, add to the commit instruction section (within the `commitInstructions` template) a clear instruction that the commit message must not include any trailers like Co-Authored-By
2. Update tests in the execution prompt test file to check for the new instruction

## Acceptance Criteria
- [ ] Execution prompt includes explicit instruction to not add Co-Authored-By trailers
- [ ] Commit format instructions specify that ONLY the RAF format should be used with no additional lines
- [ ] Existing tests updated and passing

## Notes
- The current execution prompt is at `src/prompts/execution.ts` lines 89-103
- The commit format is: `RAF[<projectNumber>:<paddedTaskNumber>] <description>`
- This is a single-line commit message — no body, no trailers
