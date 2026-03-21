# Task: Auto-Discover Worktree Projects in raf do

## Objective
Make `raf do` (without `--worktree` flag) automatically discover pending worktree projects and include them in the project picker, auto-switching to worktree mode when one is selected.

## Context
Currently, worktree project discovery only happens when `--worktree` is explicitly passed. Users have to remember which worktree projects exist. The regular `raf do` picker should also show pending worktree projects from `~/.raf/worktrees/<repo-basename>/` so users can pick and execute them seamlessly.

## Requirements
- When `raf do` is run without arguments (triggering the project picker), also scan `~/.raf/worktrees/<repo-basename>/` for projects with pending tasks
- Merge worktree projects into the same picker list alongside regular projects, sorted chronologically
- Worktree projects should be labeled with `[worktree]` suffix, e.g. `abcdef my-feature (2/5 tasks) [worktree]`
- When a worktree project is selected, automatically behave as if `--worktree` was passed: execute tasks in the worktree path and show the post-action picker after completion
- The picker selection must carry metadata about whether the selected project is a worktree project

## Implementation Steps
1. Extend `src/ui/project-picker.ts` to accept worktree projects in addition to local ones. Add a `source` field to `PendingProjectInfo` (or similar) to distinguish worktree vs local projects
2. Create a helper function that discovers pending worktree projects for the current repo by scanning `~/.raf/worktrees/<repo-basename>/` using existing `listWorktreeProjects()` from `src/core/worktree.ts`, then deriving state for each
3. In `formatProjectChoice()`, append `[worktree]` label for worktree-sourced projects
4. In `src/commands/do.ts`, when no identifier is provided and `--worktree` is not set, call the extended picker that includes both local and worktree projects
5. When the user selects a worktree project, set the execution context to worktree mode: use the worktree path as cwd, enable the post-execution action picker, and follow the worktree execution flow
6. Add tests for the new discovery logic, picker formatting, and worktree auto-switch behavior

## Acceptance Criteria
- [ ] `raf do` without arguments shows both local and worktree pending projects
- [ ] Worktree projects are labeled with `[worktree]` in the picker
- [ ] Selecting a worktree project automatically executes in worktree mode with post-action picker
- [ ] Projects are sorted chronologically (mixed local and worktree)
- [ ] When no worktree projects exist, picker behaves exactly as before
- [ ] Tests cover the new functionality

## Notes
- Key files: `src/ui/project-picker.ts`, `src/commands/do.ts`, `src/core/worktree.ts`
- The existing `discoverAndPickWorktreeProject()` in `do.ts` (around line 491) has similar logic for `--worktree` mode — reuse patterns from there
- `listWorktreeProjects()` from `src/core/worktree.ts` returns project folder names for a given repo basename
- `getRepoBasename()` from worktree.ts gets the current repo's basename
- The picker return value needs to carry whether it's a worktree project so `do.ts` can handle it appropriately
