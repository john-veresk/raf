# Task: Mention plan files in git commit instructions

## Objective
Update the task execution prompt to explicitly mention that plan files should be included in commits when they exist.

## Context
When tasks are executed after `raf plan --amend`, new plan files may exist in the working directory. The current git commit instruction says to use `git add -A` which would include them, but it's not explicit. Making this explicit helps ensure Claude understands that plan files are part of the commit.

## Requirements
- Add a note to the Git Instructions section in the execution prompt
- Mention that plan files in the `plans/` folder should be committed if they exist
- Keep the instruction concise and integrated with existing commit flow
- Do not change the commit message format

## Implementation Steps
1. Read `src/prompts/execution.ts` to understand the current git instructions (lines 89-101)
2. Add a line to the commit instructions mentioning plan files, e.g.:
   - "This includes any plan files in the `plans/` folder"
   - Or: "Note: `git add -A` will include plan files if any were added"
3. Ensure the instruction fits naturally with the existing text
4. Test that the prompt generates correctly

## Acceptance Criteria
- [ ] Git Instructions section mentions plan files
- [ ] Instruction is clear and concise
- [ ] Does not break existing prompt structure
- [ ] Execution prompt unit tests pass (if any exist)

## Notes
- The change is purely informational - `git add -A` already includes all files
- This is a simple text addition to `src/prompts/execution.ts`
- The commit message format remains `RAF[<project>:<task>] <description>`
