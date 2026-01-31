# Outcome: Remove All RAF-Side Git Commits

## Summary

Removed all git commit operations from RAF. Claude now handles all commits during task execution - one commit per task containing both code changes and the outcome file.

## Key Changes

### Files Modified

- **src/commands/plan.ts**:
  - Removed import of `commitProjectFolder`
  - Removed import of `extractProjectNumber` (no longer needed)
  - Removed commit logic after planning phase completes
  - Removed commit logic after amendment phase completes

- **src/commands/do.ts**:
  - Removed import of `commitProjectFolder`
  - Removed commit logic when project completes (`isProjectComplete`)
  - Kept `stashChanges` and `hasUncommittedChanges` for failure handling

- **src/core/git.ts**:
  - Removed `CommitResult` interface
  - Removed `CommitType` type
  - Removed `commitProjectFolder` function
  - Kept utility functions: `isGitRepo`, `getGitStatus`, `hasUncommittedChanges`, `parseGitStatus`, `getChangedFiles`, `stashChanges`

- **CLAUDE.md**:
  - Updated "Git Commit Schema" section
  - Removed "RAF-generated commits" section (`RAF[NNN:plan]`, `RAF[NNN:outcome]`)
  - Updated to reflect that all commits are now Claude-generated during task execution
  - Added note that code changes and outcome file are committed together

### Files Deleted

- **tests/unit/git-commit-project.test.ts**: Removed tests for the deleted `commitProjectFolder` function (11 tests)

## Acceptance Criteria Met

- [x] `raf plan` does not create any git commits
- [x] `raf do` does not create any git commits
- [x] Git stashing on failure still works
- [x] No errors when running in non-git directories
- [x] CLAUDE.md updated to reflect new workflow
- [x] All tests pass (600 total after removing 11 commit tests)

## Notes

This is a simplification of the codebase - less code, clearer responsibility. Claude handles all commits during task execution, making the workflow more straightforward and giving Claude full control over what gets committed and when.

<promise>COMPLETE</promise>
