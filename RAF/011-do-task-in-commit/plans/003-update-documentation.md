# Task: Update Documentation

## Objective
Update CLAUDE.md to reflect the new commit message format where Claude writes meaningful descriptions instead of fixed project-name + task-name.

## Context
CLAUDE.md documents the Git Commit Schema in the "Architectural Decisions" section (around line 113-121). The current documentation shows:
```
RAF[<project-number>:plan]      - After planning phase completes
RAF[<project-number>:outcome]   - After all tasks complete
RAF[<project-number>:<task>]    - Claude commits during task execution
```

This needs to be updated to reflect that task commits now include meaningful descriptions written by Claude.

## Requirements
- Update the Git Commit Schema section to show the new format
- Explain that Claude writes a concise description of what was accomplished
- Note that project name is NOT included in task commits (only in RAF-generated plan/outcome commits)
- Keep documentation of `plan` and `outcome` commits unchanged (those are made by RAF, not Claude)
- Add examples showing realistic commit messages:
  ```
  RAF[005:001] Add validation for user input fields
  RAF[005:002] Fix null pointer in auth handler
  ```

## Implementation Steps
1. Read CLAUDE.md and locate the Git Commit Schema section
2. Update the task-level commit format to show it includes a description
3. Add an example showing what a real commit message might look like
4. Ensure the documentation distinguishes between:
   - RAF-generated commits (plan, outcome) - fixed format
   - Claude-generated commits (task) - meaningful description

## Acceptance Criteria
- [ ] Git Commit Schema section updated with new format
- [ ] Clear explanation that Claude writes the description
- [ ] Example provided showing realistic commit message
- [ ] Distinction between RAF commits and Claude commits maintained
- [ ] No changes to other sections of CLAUDE.md

## Notes
- This is documentation only, no code changes
- The plan and outcome commit formats remain unchanged
- Only the task-level commits (made by Claude during execution) are affected
