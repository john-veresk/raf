# Task: Add Project Name to Commit Messages

## Objective
Include the project name in commit messages using the format `RAF(project-name): task message`.

## Context
Currently, commits made by RAF don't include project context in the message. This makes it harder to identify which project a commit belongs to when looking at git history. Adding a consistent prefix improves traceability.

## Requirements
- Commit message format: `RAF(project-name): original message`
- Example: `RAF(my-project): Fix login validation bug`
- Apply to all automatic commits made during task execution
- Project name should be extracted from project folder name (without the number prefix)

## Implementation Steps
1. Modify `src/core/git.ts` `commitTaskChanges()` function
2. Add a parameter for project name or pass it through the commit context
3. Extract project name from folder: `001-my-project` -> `my-project`
4. Format commit message as: `RAF({projectName}): {originalMessage}`
5. Update `src/commands/do.ts` to pass project name when calling commit
6. Update execution prompt in `src/prompts/execution.ts` to inform Claude about the new commit format

## Acceptance Criteria
- [ ] All automatic commits use format `RAF(project-name): message`
- [ ] Project name is correctly extracted from folder name (strips number prefix)
- [ ] Works with various project folder name formats
- [ ] Existing commit functionality still works
- [ ] All tests pass

## Notes
- The project folder format is `NNN-project-name` where NNN is a 3-digit number
- Use regex like `/^\d+-(.+)$/` to extract the name portion
- Make sure special characters in project names don't break the commit
- The original commit message from Claude should be preserved after the prefix
