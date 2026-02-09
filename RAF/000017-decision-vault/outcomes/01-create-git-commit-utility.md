# Outcome: Create Git Commit Utility for Planning Artifacts

## Summary

Created the `commitPlanningArtifacts` function in `src/core/git.ts` that commits planning artifacts (input.md and decisions.md) with a consistent commit message format.

## Changes Made

### Files Modified
- **src/core/git.ts**: Added `commitPlanningArtifacts` function and required imports

### Files Created
- **tests/unit/commit-planning-artifacts.test.ts**: Comprehensive unit tests (8 test cases)

## Implementation Details

The `commitPlanningArtifacts(projectPath: string): Promise<void>` function:

1. **Extracts project info** from the path using existing `extractProjectNumber` and `extractProjectName` utilities
2. **Stages only specific files**: Uses explicit paths for `input.md` and `decisions.md` (no wildcards)
3. **Commit message format**: `RAF[NNN] Plan: project-name` (e.g., `RAF[017] Plan: decision-vault`)
4. **Graceful error handling**:
   - Logs warning if not in git repo
   - Logs warning if project number/name can't be extracted
   - Handles "nothing to commit" silently (debug log)
   - Other errors logged as warnings, never thrown

## Test Coverage

8 unit tests covering:
- Correct commit message format (numeric and base36 project numbers)
- Staging only input.md and decisions.md (no wildcards)
- Not in git repository handling
- Invalid project path handling
- "Nothing to commit" handling (both early check and commit error)
- Other git error handling (warning log, no throw)

## Acceptance Criteria Verification

- [x] Function `commitPlanningArtifacts` exists in `src/core/git.ts`
- [x] Function stages only input.md and decisions.md
- [x] Commit message follows format `RAF[NNN] Plan: project-name`
- [x] Git failures result in warning log, not thrown error
- [x] Function handles "nothing to commit" gracefully
- [x] TypeScript compiles without errors (verified with `npm run build`)

## Notes

- The plan suggested `src/utils/git.ts` but `src/core/git.ts` already existed with git utilities, so the function was added there for consistency
- The function is exported and ready to be integrated into the plan command (Task 002)
- All 741 existing tests continue to pass

<promise>COMPLETE</promise>
