---
effort: medium
---
# Task: Fix Plan Amend Prompt and Add Numeric ID Resolution

## Objective
Fix the bug where `raf plan -y <project-name>` skips the existing project check, and add numeric ID resolution to both the auto-detect prompt and the explicit `--amend` flag.

## Context
This is a follow-up fix to a previously implemented feature. Two issues:

1. **Auto mode bypass**: The amend prompt (plan.ts lines ~118-161) correctly detects existing projects in both main repo and worktrees, and offers to amend. However, the entire check is gated by `!autoMode`, so running `raf plan -y dual-wielder` when a project named "dual-wielder" already exists will silently create a new project instead of amending.

2. **Numeric ID not supported**: Neither the auto-detect flow nor the explicit `--amend` flag resolve numeric project IDs. `raf plan --amend 38` or `raf plan 38` should find project `38-dual-wielder` and work correctly.

The specific failing case: `raf-dev plan -y dual-wielder` opened fresh planning instead of amending the existing worktree project "dual-wielder".

## Requirements
- The existing project name check must run even when `-y` (auto mode) is active
- When an existing project is found in auto mode, the tool should still prompt the user (breaking out of auto mode for this safety check) — silently creating a duplicate would be worse than interrupting auto mode
- The check should cover both main-repo and worktree projects (it already does, just needs the `!autoMode` gate removed)
- `raf plan --amend 38` should resolve numeric ID `38` to the matching project in both main-repo and worktrees
- `raf plan 38` (without --amend) should also detect the existing project by numeric ID and prompt to amend
- Numeric ID resolution should use the existing `resolveProjectIdentifierWithDetails()` and `resolveWorktreeProjectByIdentifier()` utilities which already support numeric prefix matching

## Implementation Steps
1. Read `src/commands/plan.ts` — focus on:
   - The auto mode guard around line 118: `if (projectName && !autoMode)`
   - The `--amend` flag handling and how it resolves project identifiers
   - The `runAmendCommand()` function
2. Read `src/utils/paths.ts` — understand `resolveProjectIdentifierWithDetails()` which already supports numeric prefix matching
3. Read `src/core/worktree.ts` — understand `resolveWorktreeProjectByIdentifier()` which also supports numeric matching
4. Remove the `!autoMode` condition so the existing project check runs regardless of mode
5. Update the auto-detect check to use `resolveProjectIdentifierWithDetails()` (which handles numeric IDs) instead of any name-only matching
6. Update the `--amend` flag handling to accept numeric IDs, using the same resolution utilities
7. Ensure resolution checks both main-repo and worktree projects for both flows

## Acceptance Criteria
- [ ] `raf plan -y <existing-project-name>` detects the existing project and prompts to amend
- [ ] `raf plan -y <numeric-id>` (e.g., `raf plan -y 38`) detects the existing project and prompts to amend
- [ ] `raf plan --amend <numeric-id>` resolves the project correctly and enters amend mode
- [ ] `raf plan --amend <project-name>` continues to work as before
- [ ] Resolution checks both main-repo and worktree projects in all cases
- [ ] If user selects "amend", the amend flow runs correctly
- [ ] If user selects "create new", a new project is created as before
- [ ] Non-auto-mode behavior is unchanged

## Notes
- The resolution utilities (`resolveProjectIdentifierWithDetails`, `resolveWorktreeProjectByIdentifier`) already support numeric prefix matching — reuse them rather than adding custom logic
- The safety prompt intentionally breaks auto mode — duplicating a project name is almost always a mistake
- Effort bumped to medium since this touches both the auto-detect and --amend flows with ID resolution logic
