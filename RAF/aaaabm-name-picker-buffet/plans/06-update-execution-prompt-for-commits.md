# Task: Update Execution Prompt for Commit Workflow

## Objective
Update Claude's execution prompt to instruct it to commit code changes and outcome file together, then produce the completion marker.

## Context
With RAF no longer handling commits (task 005), Claude must commit as part of task execution. The prompt needs to clearly instruct this workflow and provide file location information.

## Requirements
- Instruct Claude to commit code changes + outcome file in ONE commit
- Provide clear file paths for where to write outcome file
- Specify commit message format: `RAF[NNN:task] description`
- Ensure `<promise>COMPLETE</promise>` comes AFTER the commit
- Handle the case where there are no code changes (outcome-only commit)

## Implementation Steps
1. Update `src/prompts/execution.ts`:
   - Add section about git commit workflow
   - Specify outcome file path explicitly: `RAF/NNN-project/outcomes/NNN-task-name.md`
   - Instruct: write outcome file → git add → git commit → produce `<promise>COMPLETE</promise>`
   - Include commit message format with example
2. Add instruction about staging specific files (not `git add .`):
   - Stage changed code files by name
   - Stage outcome file by path
3. Add instruction for failed tasks:
   - Still write outcome file with `<promise>FAILED</promise>`
   - Do NOT commit on failure (keep changes for debugging)
4. Review and update the execution prompt template to include:
   - Explicit outcome file path
   - Project folder path
   - Task number and name
5. Add/update tests for prompt generation

## Acceptance Criteria
- [ ] Execution prompt includes commit instructions
- [ ] Outcome file path is explicitly provided
- [ ] Commit message format is specified: `RAF[NNN:task] description`
- [ ] Instructions specify: write outcome → commit → output marker
- [ ] Failed tasks: write outcome with FAILED marker, no commit
- [ ] Claude commits code + outcome in single commit during execution
- [ ] All tests pass

## Notes
- Depends on task 005 (remove RAF commits) - Claude must commit because RAF won't
- The sequence is critical: outcome file must be committed BEFORE the marker is output
- Consider adding examples in the prompt for clarity
- Test manually after implementation to verify Claude follows instructions
