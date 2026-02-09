# Task: Commit Show Model at Task Start

## Objective
Commit the existing implementation that logs the Claude model name when task execution begins.

## Context
Task 007 from RAF/001-raf-task-improvements has already been implemented. The code changes exist in uncommitted files and need to be committed to complete the task.

## Requirements
- Commit the existing implementation in `src/commands/do.ts` and `src/utils/config.ts`
- Include the test file `tests/unit/config.test.ts`
- Verify tests pass before committing
- Update version in package.json
- Move the original plan file to outcomes folder

## Implementation Steps
1. Run tests to verify the implementation works: `npm test`
2. Review the uncommitted changes:
   - `src/utils/config.ts`: Added `getClaudeModel()` function that reads model from `~/.claude/settings.json`
   - `src/commands/do.ts`: Added logging of model name at task start
   - `tests/unit/config.test.ts`: Unit tests for `getClaudeModel()`
3. Update version in package.json (minor bump)
4. Stage and commit the changes with appropriate commit message
5. Move `RAF/001-raf-task-improvements/plans/007-show-model-at-task-start.md` to `RAF/001-raf-task-improvements/outcomes/007-show-model-at-task-start.md`
6. Create outcome summary documenting what was implemented

## Acceptance Criteria
- [ ] All tests pass
- [ ] Changes committed with descriptive message
- [ ] Version updated in package.json
- [ ] Plan file moved to outcomes folder
- [ ] Outcome file documents the implementation

## Notes
- The implementation reads model from Claude CLI settings at `~/.claude/settings.json`
- Returns null gracefully if settings file doesn't exist or model not specified
- Model is logged once at task start: `Using model: {model-name}`
