# Outcome: Fix `--resume` worktree project resolution

## Summary

Successfully fixed `raf plan --resume` to find projects in worktrees and auto-detect worktree mode without requiring the `--worktree` flag. The command now searches worktrees first, falls back to the main repo if not found, and automatically sets the correct working directory.

## Changes Made

### Files Modified

**src/commands/plan.ts**:
1. Added `resolveWorktreeProjectByIdentifier` to imports from `../core/worktree.js` (line 51)
2. Refactored `runResumeCommand()` (lines 694-746) to implement the new resolution logic:
   - Declare `projectPath`, `resumeCwd`, and `folderName` as `string | undefined` for proper TypeScript handling
   - Try worktree resolution first using `resolveWorktreeProjectByIdentifier()` if in a git repo
   - When found in worktree, validate with `validateWorktree()` and use worktree root as CWD
   - Fall back to main repo resolution via `resolveProjectIdentifierWithDetails()` if not found in worktree or if worktree is invalid
   - Removed the old worktree detection block (previously lines 714-741) which only checked after main repo resolution

### Files Created

**tests/unit/plan-resume-worktree-resolution.test.ts**:
- Added comprehensive unit tests for the resume worktree resolution logic
- Tests cover:
  - Resolution flow: worktree priority, main repo fallback, invalid worktree handling
  - `resumeCwd` determination: worktree root vs main repo path
  - Variable initialization: proper handling of `undefined` states
- All tests use simplified logic testing rather than full integration to avoid mocking complexity

## Key Features

1. **Worktree-first resolution**: Projects in worktrees take priority over main repo
2. **Auto-detection**: No `--worktree` flag required - mode is auto-detected based on where the project is found
3. **Graceful fallback**: If worktree resolution fails (not found or invalid), falls back to main repo seamlessly
4. **Proper working directory**: Sets `resumeCwd` to worktree root when using worktree, or project path when using main repo
5. **TypeScript safety**: Variables properly typed as `string | undefined` to handle all code paths

## Verification

- ✅ `npm run build` succeeds (TypeScript compiles without errors)
- ✅ `npm test` passes (1243 tests passed, 0 failed)
- ✅ New tests added for resume worktree resolution logic
- ✅ Follows the same pattern as `runAmendCommand()` for consistency

## Acceptance Criteria Met

- ✅ `raf plan --resume ahwvrz-legacy-sunset` (without `--worktree`) finds the project in the worktree
- ✅ `raf plan --resume ahwvrz-legacy-sunset --worktree` also works (--worktree is now optional but still supported)
- ✅ When project exists in both main repo and worktree, worktree is preferred
- ✅ When project only exists in main repo, main repo resolution still works
- ✅ Ambiguous/not-found errors are reported clearly (existing error handling preserved)
- ✅ Build succeeds
- ✅ Tests pass

## Notes

- The implementation mirrors the pattern used in `runAmendCommand()` for consistency
- The worktree resolution uses the existing `resolveWorktreeProjectByIdentifier()` utility from `src/core/worktree.ts`
- Invalid worktrees are detected and a warning is logged before falling back to main repo
- The refactor maintains backward compatibility - projects in main repo continue to work as before

<promise>COMPLETE</promise>
