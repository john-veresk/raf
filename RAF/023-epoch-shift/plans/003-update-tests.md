# Task: Update Tests for New Epoch-Based ID System

## Objective
Rewrite all unit tests affected by the project ID format change to test the new 6-character base36 epoch-based ID system.

## Context
The test suite in `tests/unit/paths.test.ts` (~741 lines) extensively tests the old sequential numbering and base36 encoding. After tasks 001 and 002 change the production code, these tests will all fail. Other test files (`status-command.test.ts`, `plan-command.test.ts`, `do-command.test.ts`) may also have hardcoded project folder names in old format.

## Dependencies
001, 002

## Requirements
- Rewrite `tests/unit/paths.test.ts` to cover:
  - `encodeBase36()` — now encodes any non-negative integer to 6-char zero-padded base36
  - `decodeBase36()` — inverse of encode
  - `getNextProjectNumber()` — generates from current timestamp, handles collisions
  - `formatProjectNumber()` — produces 6-char strings
  - `extractProjectNumber()` — extracts 6-char prefix from folder names
  - `extractProjectName()` — extracts name portion after 6-char prefix
  - `parseProjectPrefix()` — parses 6-char base36 strings
  - `resolveProjectIdentifierWithDetails()` — test all resolution paths (6-char ID, folder name, project name)
  - `listProjects()` — lists projects with new format
  - `discoverProjects()` — discovers projects with new format
- Update any test fixtures that use old folder names (e.g., `001-test-project` → `00abcd-test-project`)
- Test collision handling in `getNextProjectNumber()` — mock `Date.now()` and pre-create folders
- Test edge cases: zero timestamp (epoch start), very large timestamps, invalid format strings
- Update tests in other test files (`status-command.test.ts`, `plan-command.test.ts`, `do-command.test.ts`) that reference project folder names with old format

## Implementation Steps
1. Read existing test files to understand current test structure and patterns
2. Rewrite `tests/unit/paths.test.ts` for the new ID system
3. Update project folder references in `tests/unit/status-command.test.ts`
4. Update project folder references in `tests/unit/plan-command.test.ts`
5. Update project folder references in `tests/unit/do-command.test.ts`
6. Run all tests and fix any remaining failures

## Acceptance Criteria
- [ ] All tests in `paths.test.ts` rewritten and passing
- [ ] Tests cover encode/decode round-trip
- [ ] Tests cover collision handling
- [ ] Tests cover identifier resolution (6-char ID, full folder, name)
- [ ] Tests in other files updated with new folder format
- [ ] `npm test` passes with all tests green
- [ ] No references to old folder format (e.g., `001-`, `a00-`) remain in test files for project IDs (task IDs like `001-task.md` within plans/outcomes are fine)

## Notes
- For time-dependent tests, mock `Date.now()` to return predictable values. E.g., `Date.now = jest.fn(() => (1767225600 + 12345) * 1000)` → ID should be `encodeBase36(12345)` = `"0009ix"`.
- Remember task IDs within projects still use the `001`, `002` format — only project-level IDs changed.
