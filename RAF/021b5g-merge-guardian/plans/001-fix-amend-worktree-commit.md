# Task: Fix Amend Worktree Commit Bug

## Objective
Fix the bug where input.md and decisions.md changes are not committed when running `raf plan --amend --worktree`.

## Context
When amending a project in worktree mode, the updated input.md and decisions.md files are not being committed. The previous fix attempt (commit c94558940d) added `additionalFiles` and `isAmend` support to `commitPlanningArtifacts()`, but the bug persists specifically in the worktree scenario. The non-worktree amend flow works correctly.

The root cause is unknown and requires investigation of the full amend+worktree flow — specifically how the worktree is recreated from an existing branch, how file paths are resolved, and how `cwd` is passed through to git commit operations.

## Requirements
- Investigate the amend+worktree flow end-to-end: worktree recreation, file writing, path resolution, and git commit
- Identify why input.md and decisions.md changes aren't staged/committed in worktree mode
- Fix the root cause (likely a path or cwd mismatch between where files are written and where git operates)
- Verify the fix works for both: fresh worktree creation and worktree recreation from existing branch
- Ensure the non-worktree amend flow remains unaffected

## Implementation Steps
1. Trace the amend+worktree flow in `src/commands/plan.ts` — follow the code path when both `--amend` and `--worktree` flags are set
2. Check how the worktree is recreated (from branch vs fresh) and where the project folder ends up
3. Examine how `commitPlanningArtifacts()` receives the `cwd` parameter in the amend+worktree case
4. Verify that the project path passed to `commitPlanningArtifacts()` matches the actual worktree location where files were written
5. Add or fix the `cwd` parameter passing so git operations run inside the worktree
6. Write tests covering the amend+worktree commit scenario
7. Manually verify with a real amend+worktree flow if possible

## Acceptance Criteria
- [ ] Root cause identified and documented in the outcome
- [ ] input.md and decisions.md changes are committed during amend+worktree operations
- [ ] New plan files are also committed correctly (regression check)
- [ ] Non-worktree amend flow still works
- [ ] Tests added covering the amend+worktree commit path
- [ ] All existing tests pass

## Notes
- Previous fix attempt: commit c94558940d232fabcf8023c92867891de3a0dbcc
- Key files: `src/commands/plan.ts`, `src/core/git.ts` (commitPlanningArtifacts), `src/core/worktree.ts`
- The worktree root path is `~/.raf/worktrees/<repo-basename>/<project-folder>/`
- Pay attention to the difference between the project path inside the worktree vs the worktree root — git operations need the worktree root as cwd, while file paths are relative to the project folder inside it
