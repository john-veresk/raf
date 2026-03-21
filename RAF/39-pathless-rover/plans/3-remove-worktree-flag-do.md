---
effort: medium
---
# Task: Remove --worktree Flag from raf do — Auto-detect Project Location

## Objective
Remove the `--worktree` and `--no-worktree` CLI flags from `raf do` and make project discovery always scan both worktree and main repo locations automatically.

## Context
`raf do` already has auto-detection logic that checks worktrees first and auto-switches to worktree mode when a project is found there. The `--worktree` flag is largely redundant. Removing it simplifies the CLI and prevents user confusion. The existing scanning/auto-detection behavior becomes the only path.

## Requirements
- Remove `-w, --worktree` and `--no-worktree` options from the Commander definition in `do.ts`
- Remove `worktreeMode` variable that reads from `options.worktree ?? getWorktreeDefault()`
- Ensure the unified project discovery flow (scanning both worktree and main, with worktree taking precedence) is always active
- The post-execution actions (merge, PR, leave) should still work when a project is in a worktree
- Error messages should not reference `--worktree` flag
- Remove `DoCommandOptions.worktree` from the options interface if it exists

## Implementation Steps
1. Read `src/commands/do.ts` fully to understand all worktree flag references
2. Remove the `-w, --worktree` and `--no-worktree` option lines from `createDoCommand()`
3. Remove `worktreeMode = options.worktree ?? getWorktreeDefault()` — instead, derive worktree mode from where the project is actually found
4. Simplify the branching logic:
   - The "if worktreeMode" block (lines ~233-268) that does early worktree-specific setup should be folded into the general flow
   - The unified project picker (lines ~270-314) should always run when no identifier is provided
   - When an identifier IS provided, the existing resolution logic (try worktree first, then main) should be the only path
5. Keep all worktree execution logic intact (worktreeRoot, originalBranch, post-actions) — these are determined by where the project is found, not by a flag
6. Update any error messages that reference `--worktree`
7. Build and verify no type errors

## Acceptance Criteria
- [ ] `raf do` CLI no longer accepts `--worktree` or `--no-worktree`
- [ ] `raf do` (no args) shows combined picker of worktree + main projects
- [ ] `raf do <project>` auto-detects if project is in worktree or main
- [ ] Post-execution worktree actions (merge/PR/leave) still work correctly
- [ ] TypeScript compiles without errors

## Notes
- Be careful with the `originalBranch` recording — it's currently done early in the worktree block but still needs to happen when a worktree project is selected
- The `pullMainBranch` sync logic should still run when executing in a worktree — just triggered by project location rather than flag
