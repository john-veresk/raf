# Task: Auto-Commit After Planning

## Objective
Automatically commit the RAF project folder (input, decisions, plans) after the planning step completes successfully.

## Context
When a project is planned, the `RAF/NNN-project-name/` folder is created with `input.md`, `decisions/DECISIONS.md`, and plan files in `plans/`. These should be committed to preserve the planning work and make it easy to share or review the project plan.

## Requirements
- After `raf plan` completes successfully, commit the project folder
- Commit message format: `RAF(project-name): Plan complete`
- Only commit files within the project folder: `RAF/NNN-project-name/**`
- Do not commit if planning was cancelled or failed
- Do not commit unrelated changes in the repository

## Implementation Steps

1. **Add commit function for planning** (`src/core/git.ts`)
   - Create `commitProjectFolder(projectPath, projectName)` function
   - Stage only files within the project folder
   - Use commit message: `RAF(project-name): Plan complete`

2. **Update `raf plan` command** (`src/commands/plan.ts`)
   - After successful Claude interactive session completion
   - After plan files are created
   - Call `commitProjectFolder` with project path and name
   - Handle commit failure gracefully (log warning, don't fail the command)

3. **Implement selective staging**
   - Use `git add RAF/NNN-project-name/` to stage only project files
   - Verify files are staged before committing
   - Skip commit if no files to commit (edge case)

4. **Add error handling**
   - Catch git errors and log them
   - Don't fail the plan command if commit fails
   - Inform user that commit failed but planning succeeded

5. **Update tests**
   - Test that commit happens after successful planning
   - Test commit message format
   - Test that only project files are committed
   - Test graceful handling of commit failures

## Acceptance Criteria
- [ ] After successful `raf plan`, project folder is committed
- [ ] Commit message is `RAF(project-name): Plan complete`
- [ ] Only files in `RAF/NNN-project-name/` are committed
- [ ] Unrelated changes in repo are not committed
- [ ] Planning doesn't fail if commit fails
- [ ] User is informed of commit success/failure
- [ ] Tests cover commit scenarios

## Notes
- This runs after the interactive Claude session, not during
- If user manually committed during planning, this will be a no-op (nothing to commit)
- Consider: what if there are staged changes before planning? Should we stash first? Decision: No, just commit project folder specifically
