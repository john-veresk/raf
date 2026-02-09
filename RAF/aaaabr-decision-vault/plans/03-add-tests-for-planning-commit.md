# Task: Add Tests for Planning Commit Functionality

## Objective
Write unit tests for the git commit utility to ensure correct behavior in various scenarios.

## Context
The new git commit functionality needs test coverage to verify it works correctly and handles edge cases properly.

## Dependencies
001

## Requirements
- Test the `commitPlanningArtifacts` function
- Cover success and failure scenarios
- Mock git commands to avoid actual git operations in tests

## Implementation Steps
1. Create test file `tests/utils/git.test.ts`
2. Write tests for:
   - **Happy path**: Successfully commits input.md and decisions.md
   - **Correct commit message**: Verifies format `RAF[NNN] Plan: project-name`
   - **Not a git repo**: Warns and continues (doesn't throw)
   - **Nothing to commit**: Warns and continues (doesn't throw)
   - **Files don't exist**: Warns and continues (doesn't throw)
3. Mock `child_process.exec` or the underlying git execution
4. Verify correct files are staged (only input.md and decisions.md)
5. Run tests and ensure they pass

## Acceptance Criteria
- [ ] Test file exists at `tests/utils/git.test.ts`
- [ ] Tests cover successful commit scenario
- [ ] Tests verify commit message format
- [ ] Tests cover "not a git repo" scenario
- [ ] Tests cover "nothing to commit" scenario
- [ ] All tests pass with `npm test`

## Notes
- Follow existing test patterns in the codebase
- Use Jest mocking for git command execution
- Look at other test files in `tests/` for patterns and conventions
