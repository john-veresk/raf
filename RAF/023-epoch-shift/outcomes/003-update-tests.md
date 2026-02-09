# Outcome: Update All Tests for 6-Char Base36 Project IDs

## Summary

Updated all test files affected by the project ID format change from sequential 3-char prefixes (e.g., `001-project`, `a01-project`) to epoch-based 6-char base36 prefixes (e.g., `000001-project`, `00a001-project`). All 842 tests across 41 suites pass.

## Key Changes

### `tests/unit/status-command.test.ts`
- Updated all project folder names from 3-char to 6-char prefixes (e.g., `003-numeric-project` → `000003-numeric-project`)
- Changed `createProject` helper to use `encodeBase36(number)` instead of `padStart(3, '0')`
- Updated test identifiers from `'3'`, `'003'`, `'a00'` to `'000003'`, `'00a001'`, etc.
- Added `encodeBase36` import from paths.ts
- Added negative test for old-format folder rejection

### `tests/unit/plan-command.test.ts`
- Updated all project folder names from 3-char to 6-char prefixes
- Changed resolution test identifiers from `'3'`, `'a01'`, `'1'` to `'000003'`, `'00a001'`, `'000001'`

### `tests/unit/do-command.test.ts`
- Updated all project folder names from 3-char to 6-char prefixes
- Removed obsolete "Backward Compatibility" section that tested old 3-char and numeric identifiers
- Tests now verify 6-char base36 prefix resolution, full folder name resolution, and name resolution

### `tests/unit/project-picker.test.ts`
- Updated all mock data paths from `001-*`, `002-*` to `000001-*`, `000002-*`
- Updated format expectations from `'001 fix-auth-bug (2/5 tasks)'` to `'000001 fix-auth-bug (2/5 tasks)'`
- Updated `mockSelect` return values accordingly

### `tests/unit/project-manager.test.ts`
- Changed tests to use regex matching for epoch-based IDs (e.g., `/^[0-9a-z]{6}-first$/`) instead of exact matches
- Uses `toBeGreaterThanOrEqual` comparisons for epoch-based ID values
- Added imports for `encodeBase36` and `RAF_EPOCH`

### `tests/unit/state-derivation.test.ts`
- Updated `discoverProjects` tests from `001-first-project` to `000001-first-project`
- Added `001-too-short` as an intentionally ignored directory (validates 3-char prefixes are rejected)

### `tests/unit/planning-prompt.test.ts`
- Fixed pre-existing bug: changed assertion from `'3-8 distinct'` to `'identify distinct'` to match actual prompt text

### `tests/unit/commit-planning-artifacts.test.ts`
- Updated `017-decision-vault` → `000017-decision-vault`
- Updated `a01-my-feature` → `00a001-my-feature`
- Updated regex patterns `RAF\[017\]` → `RAF\[000017\]` and `RAF\[a01\]` → `RAF\[00a001\]`

## Files Not Changed (Verified Correct)

The following test files use 3-char prefixes but were verified to be correct:
- `do-blocked-tasks.test.ts`, `do-rerun.test.ts`, `dependency-integration.test.ts` — use `001-test-project` as arbitrary temp directory names not parsed by project resolution; inner references are task-level IDs (3-digit, intentionally unchanged)
- `worktree.test.ts`, `worktree-integration.test.ts`, `plan-amend-worktree-recreate.test.ts`, `do-worktree-cleanup.test.ts` — use names as branch names/worktree paths, not parsed by project ID resolution

## Verification

- All 842 tests pass across 41 test suites
- TypeScript compiles with no errors
- No old-format project ID references remain in test files (only task-level 3-digit IDs, temp directory names, and intentional negative test cases)

<promise>COMPLETE</promise>
