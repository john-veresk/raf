---
effort: medium
---
# Task: Remove --worktree Flag from raf plan --amend — Auto-detect Project Location

## Objective
Make `raf plan --amend` auto-detect whether a project lives in a worktree or main repo, removing the need for `--worktree`/`--no-worktree` flags in the amend flow. Keep the flags for NEW project creation only.

## Context
When amending an existing project, the project already exists somewhere — either in main repo or a worktree. The tool should find it and amend in-place rather than requiring the user to specify `--worktree`. The `--worktree`/`--no-worktree` flags remain valid for `raf plan` (new project creation) since they control WHERE the project gets created.

## Dependencies
3

## Requirements
- `raf plan <project> --amend` should auto-detect project location (main repo or worktree) and amend there
- `raf plan <project>` (auto-amend via name collision) should scan BOTH main repo and worktrees for matches
- The `--worktree`/`--no-worktree` flags should still exist on the `plan` command for new project creation
- When amend flow is triggered, ignore the `--worktree` flag value — always use auto-detected location
- `runAmendCommand` should no longer accept a `worktreeMode` boolean — it should determine this internally

## Implementation Steps
1. Read `src/commands/plan.ts` fully — understand `runAmendCommand` and the auto-amend detection in `runPlanCommand`
2. Modify `runAmendCommand` signature to remove `worktreeMode` parameter
3. Inside `runAmendCommand`, auto-detect project location:
   - First check main repo with `resolveProjectIdentifierWithDetails()`
   - Then check worktrees with `resolveWorktreeProjectByIdentifier()`
   - Use whichever location has the project (worktree takes precedence if both exist, matching existing picker behavior)
4. Update the auto-amend detection in `runPlanCommand` (lines ~122-163):
   - It already scans both main and worktrees — ensure the detected `existingWorktreeMode` is passed correctly to `runAmendCommand` (or let `runAmendCommand` detect it internally)
5. Update the call site at line ~102 where `runAmendCommand` is called with `worktreeMode`
6. Update the call site at line ~156 where auto-amend calls `runAmendCommand`
7. Build and verify no type errors

## Acceptance Criteria
- [ ] `raf plan myproject --amend` finds project in worktree without needing `--worktree` flag
- [ ] `raf plan myproject --amend` finds project in main repo without needing `--no-worktree` flag
- [ ] `raf plan myproject` (name collision) detects projects in both worktree and main
- [ ] `--worktree`/`--no-worktree` flags still work for new project creation
- [ ] TypeScript compiles without errors

## Notes
- The existing amend logic in lines ~400-700 has complex worktree resolution (recreating worktrees from branches, copying files). When auto-detecting, this should simplify: just find where the project is and amend there. No need to create worktrees for amend.
