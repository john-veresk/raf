# Task: Update Tests

## Objective
Update the execution prompt unit tests to reflect the new commit message format that instructs Claude to write meaningful descriptions.

## Context
The test file `tests/unit/execution-prompt.test.ts` has tests that verify the old commit message format:
- `should include RAF commit schema format in prompt` - checks for exact format like `RAF[005:001] task-naming-improvements enhance-identifier-resolution`
- `should include task name in commit message` - checks for task name
- `should include project name in commit message` - checks for project name
- `Complete Commit Message` describe block - multiple tests checking exact commit message format

These tests need to be updated to reflect the new behavior.

## Requirements
- Update tests to verify the new commit message format
- Tests should verify:
  - RAF prefix is still present (e.g., `RAF[005:001]`)
  - Task number zero-padding still works
  - Instruction to write concise description is present
  - Git Instructions section is present when autoCommit is true
  - Git Instructions section is absent when autoCommit is false
  - Project name is NOT in the commit message instruction
- Remove tests that check for exact `projectName taskName` format
- Update `baseParams` if `projectName`/`taskName` are removed from interface

## Implementation Steps
1. Read `tests/unit/execution-prompt.test.ts` to understand current test structure
2. Update the `Commit Message Format` describe block:
   - Modify test for exact format to check for new instruction style
   - Keep tests for zero-padding (001, 012, 123)
   - Keep test for base36 project numbers
   - Update or remove tests checking for taskName and projectName in commit message
3. Update the `Complete Commit Message` describe block:
   - Remove tests that check for exact `projectName taskName` format
   - Add tests that verify meaningful description instruction is present
4. Update `baseParams` fixture if interface changed
5. Run tests to verify they pass

## Acceptance Criteria
- [ ] All tests pass with `npm test`
- [ ] Tests verify RAF prefix format is preserved
- [ ] Tests verify task number padding still works
- [ ] Tests verify instruction for meaningful description is present
- [ ] No tests checking for exact `projectName taskName` format
- [ ] Test coverage maintained for commit-related functionality

## Notes
- Depends on Task 001 being completed first
- Some tests may need to be removed entirely if they tested specific format that no longer exists
- Consider adding a test that verifies the wording of the new instruction
