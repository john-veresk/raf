# Task: Update tests for base26 project ID encoding

## Objective
Update all unit and integration tests to reflect the base36-to-base26 encoding change for project IDs.

## Context
After task 01 changes the core encoding functions, all existing tests that reference base36 project IDs will fail. Test fixtures, expected values, and regex patterns need updating. Task ID tests should remain unchanged.

## Dependencies
01

## Requirements
- All test cases for encode/decode functions updated with base26 expected values
- Test fixtures using project folder names (e.g., "00abc0-project") updated to base26 format (e.g., "aabcda-project" or similar valid base26 IDs)
- Regex pattern assertions updated from `[0-9a-z]{6}` to `[a-z]{6}`
- Task ID test cases remain untouched
- Edge cases covered: zero value ("aaaaaa"), max value, boundary values, invalid inputs (digits should be rejected)

## Implementation Steps
1. Update `tests/unit/paths.test.ts` — rewrite `encodeBase36`/`decodeBase36` test suites for the new base26 functions with correct expected values.
2. Update `isBase36Prefix` tests → validate new prefix checker rejects digits, accepts pure a-z.
3. Update `extractProjectNumber`, `extractProjectName`, `parseProjectPrefix` tests with base26 folder name fixtures.
4. Update `resolveProjectIdentifier` tests — all project folder fixtures must use base26 prefixes.
5. Update `getNextProjectNumber` tests — expected IDs should be base26 encoded.
6. Update `listProjects` tests if they have base36 fixtures.
7. Search all other test files for hardcoded project IDs (grep for patterns like `[0-9a-z]{6}-` or specific IDs like "00abc0") and update them.
8. Run full test suite and ensure all tests pass.

## Acceptance Criteria
- [ ] All 40+ test suites pass (`npm test`)
- [ ] No test references old base36 project ID format (except task ID tests which stay base36)
- [ ] Edge cases covered: zero encoding, max value, invalid characters (digits), wrong length
- [ ] No skipped or commented-out tests

## Notes
- The main test file is `tests/unit/paths.test.ts` (~525 lines) but other test files may contain project ID fixtures too.
- New base26 encode/decode cannot use `parseInt`/`toString` — verify tests check the custom implementation correctly.
