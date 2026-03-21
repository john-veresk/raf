---
effort: medium
---
# Task: Unified Project Scanning in `raf do` Worktree Mode

## Objective
Make `raf do --worktree` show both worktree and main-repo projects in the interactive picker, instead of only worktree projects.

## Context
Currently, `raf do` has two scanning modes:
- **Standard mode**: scans both main-repo and worktree projects (via `pickPendingProject()` + `getPendingWorktreeProjects()`)
- **Worktree mode** (`--worktree`): only scans worktree projects (via `discoverAndPickWorktreeProject()`)

This is confusing — users expect to see all pending projects regardless of where they live. The fix should make worktree mode also show main-repo projects.

## Requirements
- In worktree mode, the project picker should show both worktree AND main-repo pending projects
- When a project exists in both main repo and worktree, the worktree version takes precedence (dedup)
- The existing threshold filter logic in `discoverAndPickWorktreeProject()` should still apply to worktree projects
- Main-repo projects should be clearly distinguishable from worktree projects in the picker (if they aren't already)
- When a main-repo project is selected in worktree mode, the existing worktree creation flow should kick in as normal

## Implementation Steps
1. Read `src/commands/do.ts` — focus on `discoverAndPickWorktreeProject()` (lines ~659-770) and the standard mode picker logic (lines ~270-299)
2. Read `src/ui/project-picker.ts` — understand `getPendingWorktreeProjects()` and `pickPendingProject()` and how dedup works
3. Modify `discoverAndPickWorktreeProject()` to also discover main-repo pending projects using existing utilities
4. Merge the two lists with worktree versions taking precedence on duplicates
5. Update the picker display if needed to indicate project source (worktree vs main)
6. Test the flow manually to ensure both project types appear

## Acceptance Criteria
- [ ] `raf do --worktree` shows pending projects from both worktree and main repo
- [ ] Duplicate projects are deduped with worktree version taking precedence
- [ ] Selecting a main-repo project in worktree mode correctly creates/uses a worktree
- [ ] Existing worktree-only scanning behavior is replaced by unified scanning
- [ ] No regressions in standard (non-worktree) mode

## Notes
- The standard mode already has this merging logic — reuse it rather than reimplementing
- Be careful with the threshold filter — it should only apply to worktree project filtering, not main-repo projects
