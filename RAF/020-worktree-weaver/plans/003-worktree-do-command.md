# Task: Add --worktree Flag to Do Command

## Objective
Add `--worktree` flag to `raf do` that validates the worktree exists and executes all tasks inside the worktree directory, with optional auto-discovery of worktree projects when no project identifier is given.

## Context
After planning with `--worktree`, the user runs `raf do <project> --worktree` to execute tasks. RAF needs to validate the worktree exists at `~/.raf/worktrees/<repo-basename>/<project-id>`, find the project inside it, and run all Claude execution sessions with cwd set to the worktree root.

Additionally, `raf do --worktree` (without a project identifier) should auto-discover uncompleted worktree projects by scanning the worktrees directory and filtering to projects that come after the latest completed project in the main tree.

## Dependencies
001

## Requirements
- Add `--worktree` boolean flag to the do command in Commander.js
- When `--worktree` is used with a project identifier, only a SINGLE project is supported - error if multiple projects are specified
- When `--worktree` is used WITHOUT a project identifier, perform auto-discovery:
  1. Use the listing utility from task 001 to get all worktree project directories for this repo
  2. If no worktree projects exist, show error: "No worktree projects found. Did you plan with --worktree?"
  3. Find the highest-numbered completed project in the MAIN tree (using `deriveProjectState`)
  4. Filter worktree projects to those with a project number >= (highest completed - 3). For example, if the highest completed main-tree project is 008, include worktree projects 006 and above. This accounts for amended projects that may have new uncompleted tasks added via `--amend`
  5. For each remaining worktree project, derive its state and keep only uncompleted ones (pending, failed, or in-progress — anything that is NOT fully completed)
  6. If no uncompleted worktree projects remain after filtering, show message: "All worktree projects are completed"
  7. Show an interactive picker with the uncompleted worktree projects (even if there's only one), allowing the user to cancel with Ctrl+C
  8. Execute the selected project
- When `--worktree` is used with an explicit project identifier, validate:
  1. The worktree directory exists at `~/.raf/worktrees/<repo-basename>/<project-id>`
  2. The worktree is a valid git worktree (listed in `git worktree list`)
  3. The project folder exists inside the worktree with plan files
  4. If any validation fails, show a helpful error message (e.g., "No worktree found for project X. Did you plan with --worktree?")
- Execution flow with `--worktree` (after project is selected/resolved):
  1. Resolve project identifier to get project folder name
  2. Compute worktree path using utilities from task 001
  3. Validate worktree and project content
  4. Derive project state from the worktree project path (not the main repo)
  5. Execute each task with Claude's cwd set to the worktree root
  6. All commits, stashes, and git operations happen in the worktree branch
  7. State derivation, outcome files, logs - all use the worktree project path
- When `--worktree` is NOT used, behavior is exactly the same as today
- The `--worktree` flag should be compatible with all existing flags (`--timeout`, `--verbose`, `--debug`, `--force`, `--model`, `--sonnet`)
- Update `DoCommandOptions` type in `src/types/config.ts` to include `worktree?: boolean`

## Implementation Steps
1. Add `--worktree` option to the Commander command definition in `src/commands/do.ts`
2. Update `DoCommandOptions` interface in `src/types/config.ts`
3. In `runDoCommand`, branch on whether a project identifier was provided:
   - **With identifier**: validate single project only, compute worktree path, validate it exists
   - **Without identifier**: run auto-discovery flow (list worktrees, find latest completed main-tree project, filter, derive states, show picker)
4. For auto-discovery: scan main tree projects to find the highest-numbered fully-completed project using `deriveProjectState`
5. For auto-discovery: filter worktree projects to those with IDs >= (highest completed - 3), then derive each project's state to find uncompleted ones
6. For auto-discovery: show interactive picker using the existing `pickPendingProject` pattern (or similar UI) for the user to select one
7. After project selection/resolution, replace the `projectPath` with the worktree project path for all operations
8. Pass the worktree root as the working directory to `ClaudeRunner.run` and `ClaudeRunner.runVerbose`
9. Ensure `executeSingleProject` uses the worktree project path for state derivation, outcome files, and all file operations
10. The `ClaudeRunner` likely needs a `cwd` option - check if it already supports it, add if not
11. All git operations (commit verification, stash, etc.) should naturally work in the worktree since cwd is set there

## Acceptance Criteria
- [ ] `raf do --worktree` without project identifier triggers auto-discovery flow
- [ ] Auto-discovery lists worktree projects, finds latest completed main-tree project, filters correctly
- [ ] Auto-discovery shows picker even when only one uncompleted project is found
- [ ] Auto-discovery shows "No worktree projects found" when none exist
- [ ] Auto-discovery shows "All worktree projects are completed" when all are done
- [ ] `raf do proj1 proj2 --worktree` shows error about single project only
- [ ] `raf do my-feature --worktree` with no worktree shows helpful error
- [ ] `raf do my-feature --worktree` with valid worktree executes tasks in worktree
- [ ] Claude runs with cwd set to worktree root
- [ ] State derivation reads from worktree project path
- [ ] Outcome files are written to worktree project path
- [ ] Git commits land in the worktree branch
- [ ] Compatible with `--verbose`, `--timeout`, `--force`, `--debug`, `--model`
- [ ] Without `--worktree`, behavior is unchanged

## Notes
- The key change is that all paths point to the worktree version of the project, and Claude's working directory is the worktree root
- The `ClaudeRunner` class in `src/core/claude-runner.ts` likely needs a `cwd` option passed to `spawn` / `node-pty` - check if this already exists
- When a project identifier IS given, resolution still works against the MAIN repo's RAF directory to get the folder name, but then the actual project path used for execution is inside the worktree
- For auto-discovery, project identifier resolution works against the worktree directory listing — these projects only exist in worktrees, not the main tree
- The scanning threshold is: highest completed main-tree project number minus 3. E.g., if project 008 is the highest completed, scan worktrees from 006 onward. This catches amended projects that had new tasks added after completion. If no main-tree projects are completed, scan all worktrees (threshold = 0)
- Reference existing do command at `src/commands/do.ts` and `ClaudeRunner` at `src/core/claude-runner.ts`
- Reference `getPendingProjects` and `pickPendingProject` from `src/ui/project-picker.js` for the picker pattern
