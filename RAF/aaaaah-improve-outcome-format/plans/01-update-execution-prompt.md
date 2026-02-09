# Task: Update Execution Prompt for Outcome File Writing

## Objective
Modify the execution prompt to instruct Claude to write the outcome file with its report and `<promise>COMPLETE</promise>` marker.

## Context
Currently, RAF overwrites Claude's outcome file after task execution. The new approach is to have Claude write the outcome file directly as part of task completion, including the `<promise>COMPLETE</promise>` marker at the end.

## Requirements
- Update `src/prompts/execution.ts` to include instructions for writing outcome file
- Claude should write outcome to: `{projectPath}/outcomes/{taskId}-{taskName}.md`
- Outcome file must end with `<promise>COMPLETE</promise>` marker
- For documentation/report tasks, the outcome IS the deliverable
- For code tasks, outcome should summarize what was changed

## Implementation Steps
1. Read current `src/prompts/execution.ts`
2. Add outcome file path to `ExecutionPromptParams` interface
3. Add instructions section for outcome file writing:
   - Location: `outcomes/{taskId}-{taskName}.md`
   - Content: Summary of work done, key changes, any notes
   - Must end with `<promise>COMPLETE</promise>` marker
4. Move the completion marker instruction to be part of outcome file writing
5. Update tests in `tests/unit/execution-prompt.test.ts`

## Acceptance Criteria
- [ ] Execution prompt includes outcome file writing instructions
- [ ] Outcome file path is passed to prompt
- [ ] Instructions specify the `<promise>COMPLETE</promise>` marker must be at end of file
- [ ] Tests updated and passing
- [ ] Prompt clearly distinguishes between code commits and outcome file

## Notes
- The outcome file is where Claude documents what was accomplished
- For report-only tasks (like npm-publish-instructions), the outcome IS the main deliverable
- Claude should still commit code changes separately before writing outcome
