# Outcome: Fix amend mode commit to exclude plan files

## Summary
Successfully modified amend mode to only commit `input.md` and `decisions.md`, excluding new plan files. Plan files are now deferred to task execution commits, matching the behavior of initial planning.

## Changes Made

### 1. Updated `src/commands/plan.ts` (lines 650-656)
- **Before**: Amend commit included `input.md`, `decisions.md`, and all new plan files via `additionalFiles` parameter
- **After**: Amend commit only includes `input.md` and `decisions.md`
- Removed the `newPlanPaths` variable (no longer needed)
- Updated comment to clarify plan files are committed during execution

### 2. Updated `tests/unit/commit-planning-artifacts.test.ts` (lines 255-291)
- **Test name changed**: `'should stage additional files when provided'` → `'should not stage plan files in amend mode'`
- **Before**: Test verified 4 files were staged (input, decisions, 2 plan files) with `isAmend: true`
- **After**: Test verifies only 2 files are staged (input, decisions) with `isAmend: true`
- Removed `additionalFiles` parameter from the test call

### 3. Updated `tests/unit/commit-planning-artifacts-worktree.test.ts` (two tests)

#### Test 1: `'should commit with amend mode in worktree'` (lines 165-183)
- Removed `additionalFiles` array and parameter
- Changed assertion from expecting plan file to be included to expecting it NOT to be included
- Updated comment to clarify plan files are not included in amend commit

#### Test 2: `'should commit after worktree recreation from branch'` (lines 237-255)
- Removed `additionalFiles` array and parameter
- Changed assertion from expecting plan file to be included to expecting it NOT to be included
- Updated comment to clarify plan files are not included in amend commit

## Testing
All 21 tests pass:
- `commit-planning-artifacts.test.ts`: 16 tests ✓
- `commit-planning-artifacts-worktree.test.ts`: 5 tests ✓

## Acceptance Criteria
- ✅ Amend commit only stages `input.md` and `decisions.md`
- ✅ `additionalFiles` is not passed in the amend code path
- ✅ Initial planning commit behavior unchanged
- ✅ Existing tests updated and passing

<promise>COMPLETE</promise>
