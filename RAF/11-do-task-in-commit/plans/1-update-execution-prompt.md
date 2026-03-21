# Task: Update Execution Prompt

## Objective
Modify the execution prompt to instruct Claude to write meaningful commit messages describing what the task accomplished, instead of using a fixed project-name + task-name format.

## Context
Currently, the execution prompt in `src/prompts/execution.ts` tells Claude to commit with a fixed message format:
```
RAF[005:001] project-name task-name
```

This format is not descriptive of what was actually done. We want Claude to write commit messages with a concise task description, without the project name.

## Requirements
- Keep the `RAF[project:task]` prefix format (e.g., `RAF[005:001]`)
- Remove both `projectName` and `taskName` from the commit message
- Instruct Claude to write a concise description of what was accomplished
- Do NOT include project name in commit message
- Provide minimal guidance (not strict rules like conventional commits)
- Only change commit instructions when `autoCommit` is true

Example new format:
```
RAF[005:001] Add validation for user input fields
RAF[005:002] Fix null pointer in auth handler
```

## Implementation Steps
1. Read `src/prompts/execution.ts` to understand the current implementation
2. Modify the `commitInstructions` section (lines 48-56) to:
   - Keep the RAF prefix format: `RAF[${projectNumber}:${paddedTaskNumber}]`
   - Replace fixed message with instruction to write a meaningful description
3. Remove `projectName` and `taskName` parameters from the interface and function since they're no longer needed for commit messages
4. Update the `ExecutionPromptParams` interface to remove unused parameters
5. Build and verify TypeScript compiles without errors

## Acceptance Criteria
- [ ] Commit instructions tell Claude to write meaningful descriptions
- [ ] RAF prefix `RAF[project:task]` is preserved in the format
- [ ] `projectName` and `taskName` parameters removed from interface (if unused elsewhere)
- [ ] TypeScript compiles without errors
- [ ] No changes to other prompt sections (outcome file, retry context, etc.)

## Notes
- The `projectName` and `taskName` might still be used elsewhere in the prompt or codebase - check before removing from interface
- The commit message format change only affects the instructions given to Claude, not any RAF code that generates commits
