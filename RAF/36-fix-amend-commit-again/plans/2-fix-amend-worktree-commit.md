---
effort: medium
---
# Task: Fix input.md and decisions.md not committed after plan amend in worktree mode

## Objective
Fix the bug where `raf plan --amend --worktree` does not commit `input.md` and `decisions.md` after the planning session completes.

## Context
When running `raf plan --amend --worktree`, the planning session completes and new plan files are created, but the commit for `input.md` and `decisions.md` does not execute. This works correctly in regular (non-worktree) amend mode and in both modes for regular `raf plan`.

The commit logic is in `commitPlanningArtifacts()` in `src/core/git.ts`, called from `src/commands/plan.ts`.

## Requirements
- `input.md` and `decisions.md` must be committed after `raf plan --amend --worktree` completes successfully
- The commit message should use the amend format: `RAF[projectId] Amend: project-name`
- Existing behavior for regular plan (both worktree and non-worktree) must not regress
- Existing behavior for non-worktree amend must not regress

## Implementation Steps

1. **Investigate the root cause** by comparing the working regular plan worktree commit (line 323 of `plan.ts`) with the amend worktree commit (lines 636-640):
   - Regular plan: `await commitPlanningArtifacts(projectPath, worktreePath ? { cwd: worktreePath } : undefined);`
   - Amend: `await commitPlanningArtifacts(projectPath, { cwd: worktreePath ?? undefined, isAmend: true });`
   - Both pass `cwd` correctly. Investigate if the issue is in path resolution, git state, or the `commitPlanningArtifacts` function itself.

2. **Add debug logging** (temporarily or permanently) to `commitPlanningArtifacts` to trace:
   - The resolved `execCwd` value
   - The files being staged and their resolved paths
   - Whether `isGitRepo(execCwd)` returns true
   - Whether `git diff --cached --name-only` returns any staged files
   - Whether the commit command is actually reached

3. **Check for path resolution issues**: In worktree mode, `projectPath` is inside the worktree and `execCwd` is the worktree root. Verify that `path.relative(execCwd, inputFile)` produces valid relative paths that `git add` can resolve.

4. **Apply the fix**: Based on investigation, fix the root cause. Likely candidates:
   - Path mismatch between `projectPath` and `execCwd` in the amend worktree case
   - Files already committed by a previous operation (e.g., the branch already has input.md, and git doesn't detect the modification)
   - `isGitRepo` check failing for the worktree path
   - The `git add` command silently failing without throwing

5. **Add or update tests** to cover the amend worktree commit path. Check `tests/unit/git.test.ts` for existing `commitPlanningArtifacts` tests and add a case that simulates the amend + worktree scenario.

6. **Run `npm test`** to verify all tests pass.

## Acceptance Criteria
- [ ] Running `raf plan --amend --worktree` commits `input.md` and `decisions.md` with an amend-format commit message
- [ ] Regular plan (worktree and non-worktree) still commits correctly
- [ ] Non-worktree amend still commits correctly
- [ ] All tests pass with `npm test`

## Notes
- The `commitPlanningArtifacts` function uses `execSync` for git commands, which throws on non-zero exit. But individual `git add` failures are caught and logged as warnings (line 281-284), so a silent `git add` failure could cause `stagedCount` to still increment while files aren't actually staged.
- In worktree mode, macOS symlink resolution (`/tmp` → `/private/tmp`) can cause path mismatches. The code already handles this by using relative paths (lines 263-269), but verify this works in the amend case.
- The recreated worktree scenario (branch exists, worktree cleaned up after previous `raf do`) is the most likely trigger since the branch already has these files committed.
