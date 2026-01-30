# Task: Add Decisions Folder for Interview Q&A

## Objective
Capture questions and answers from the planning interview in a dedicated `/decisions` folder inside each project.

## Context
During the planning phase, Claude interviews the user via `AskUserQuestion` tool to gather requirements. Currently, these valuable Q&A exchanges are not persisted anywhere. This task adds a `/decisions` folder to capture this context for future reference and documentation.

## Requirements
- Create `/decisions` folder inside project folder (alongside `plans/` and `outcomes/`)
- Store Q&A in Markdown format using this structure:
  ```markdown
  ## Question
  Answer

  ## Question
  Answer
  ```
- Capture decisions during planning phase (when `AskUserQuestion` tool is used)
- File should be named `DECISIONS.md` or similar

## Implementation Steps
1. Update `src/core/project-manager.ts` to create `/decisions` folder during project creation
2. Modify `src/prompts/planning.ts` to instruct Claude to save Q&A to decisions folder
3. Add instructions in the planning prompt for Claude to write each Q&A pair to the decisions file
4. Update the planning prompt to specify the file path: `{projectPath}/decisions/DECISIONS.md`

## Acceptance Criteria
- [ ] `/decisions` folder is created when a new project is created
- [ ] Planning prompt instructs Claude to save Q&A pairs
- [ ] Format follows Markdown Q&A list structure
- [ ] Existing tests pass
- [ ] Manual test: run `raf plan` and verify DECISIONS.md is created with Q&A content

## Notes
- The actual Q&A capture depends on Claude following the prompt instructions
- Consider whether to append to existing file or create fresh each planning session
- The decisions file serves as documentation of design choices made during planning
