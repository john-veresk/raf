# Task 4: Remove --worktree Flag from raf plan --amend — Auto-detect Project Location

## Summary
Modified `runAmendCommand` to auto-detect whether a project lives in a worktree or main repo, removing the `worktreeMode` parameter. The `--worktree`/`--no-worktree` flags remain on the `plan` command for new project creation only.

## Changes Made

### File: `src/commands/plan.ts`
- Removed `worktreeMode` parameter from `runAmendCommand` signature
- Replaced the complex worktree-mode branch (manual worktree scanning, branch recreation, fresh worktree creation with file copying) with simple auto-detection: try `resolveWorktreeProjectByIdentifier()` first, fall back to `resolveProjectIdentifierWithDetails()` in main repo
- Updated both call sites (explicit `--amend` at line ~104 and auto-amend at line ~158) to no longer pass `worktreeMode`
- Removed `existingWorktreeMode` variable from auto-amend detection flow
- Removed redundant if/else for `raf do` suggestion (both branches were identical)
- Simplified `worktreeMode && worktreePath` guard to just `worktreePath`
- Removed `worktreeMode` from `getAmendPrompt()` call
- Cleaned up unused imports: `createWorktreeFromBranch`, `branchExists`, `computeWorktreeBaseDir`

### File: `src/prompts/amend.ts`
- Removed `worktreeMode?: boolean` from `AmendPromptParams` interface

## Verification
- TypeScript compiles without errors (`npm run build`)
- All acceptance criteria met:
  - `raf plan myproject --amend` finds project in worktree without needing `--worktree` flag
  - `raf plan myproject --amend` finds project in main repo without needing `--no-worktree` flag
  - `raf plan myproject` (name collision) detects projects in both worktree and main
  - `--worktree`/`--no-worktree` flags still work for new project creation
  - TypeScript compiles without errors

<promise>COMPLETE</promise>
