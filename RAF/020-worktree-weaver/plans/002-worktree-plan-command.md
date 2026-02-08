# Task: Add --worktree Flag to Plan Command

## Objective
Add `--worktree` flag to `raf plan` that creates a git worktree and runs the entire planning session inside it, including support for `--amend` to add tasks to existing worktree projects.

## Context
When a user runs `raf plan --worktree` (with or without a project name), RAF should create a git worktree under `~/.raf/worktrees/<repo-basename>/`, then create the project folder inside the worktree and run the interactive planning session there. The project name is optional — the normal name picker/auto-generation works since the editor uses a temp file and the worktree is only created after the name is known. When combined with `--amend`, RAF should find the existing worktree, switch into it, and run the amendment flow there.

## Dependencies
001

## Requirements

### New project flow (`raf plan [name] --worktree`)
- Add `--worktree` boolean flag to the plan command in Commander.js (both in `src/commands/plan.ts` and `src/index.ts` if needed)
- Project name is OPTIONAL with `--worktree` — same behavior as non-worktree mode:
  - If name is provided: use it directly (skip name picker)
  - If name is NOT provided: generate suggestions from input content, then picker or auto-select (same as today)
- The worktree is created AFTER the project name is determined (not before), because the worktree path includes the project ID
- Flow with `--worktree`:
  1. Validate environment
  2. Open editor for input (writes to temp file — nothing touches the main tree)
  3. Resolve project name: use provided name, or generate/pick from input content (same as today)
  4. Compute project number from the main repo's RAF directory (to get the sequential ID)
  5. Create git worktree at `~/.raf/worktrees/<repo-basename>/<project-id>` using utilities from task 001
  6. Create the project folder structure inside the worktree (at the same relative path as it would be in the main repo)
  7. Save input.md inside the worktree project folder (never in the main tree)
  8. Run interactive Claude planning session with `cwd` set to the worktree directory
  9. Commit planning artifacts (input.md, decisions.md, plan files) inside the worktree branch
  10. Show success message including the worktree path and branch name
- When `--worktree` is NOT used, behavior is exactly the same as today (no changes)
- The `--worktree` flag should be compatible with `--auto` and `--model` flags
- If worktree creation fails, error out with a clear message
- Cleanup: if planning fails or is interrupted and no plans were created, clean up the worktree

### Amend flow (`raf plan --amend <project> --worktree`)
- When `--amend` and `--worktree` are both used, the project identifier must be resolved from the worktree directory (`~/.raf/worktrees/<repo-basename>/`), NOT from the main repo — because plans only exist inside the worktree
- The worktree must already exist (it was created during initial `raf plan --worktree`) — error if not found
- Flow with `--amend --worktree`:
  1. Resolve project identifier against the worktree's project directories
  2. Validate the worktree exists and contains the project with existing plans
  3. Switch working context to the worktree directory
  4. Run the standard amend flow (derive project state, show existing tasks, open editor, run Claude amendment interview) with all paths pointing into the worktree
  5. Commit amendment artifacts (updated input.md, decisions.md, new plan files) in the worktree branch
- The project state derivation (`deriveProjectState`) should read from the worktree project path
- The amend system prompt should receive task information from the worktree project
- No worktree creation or cleanup needed for amend — the worktree already exists

## Implementation Steps
1. Add `--worktree` option to the Commander command definition in `src/commands/plan.ts`
2. Update `PlanCommandOptions` interface to include `worktree?: boolean`
3. **New project path**: When `--worktree` is set (without `--amend`):
   - Run editor (temp file) and name resolution exactly as today
   - After name is finalized, compute project number from main repo
   - Create worktree, then create project folder inside worktree
   - Save input.md inside worktree project folder
   - Run planning with cwd set to worktree root
4. **Amend path**: When `--worktree` and `--amend` are both set:
   - Resolve project identifier from `~/.raf/worktrees/<repo-basename>/` instead of main repo
   - Validate the worktree exists
   - Set all paths to worktree project path and run standard amend flow
5. For both paths, set the working directory for Claude's interactive session to the worktree root
6. After planning/amending, commit artifacts in the worktree branch
7. Add cleanup logic for worktree on failure/interruption for new projects (not for amend — worktree already existed)
8. Update the success message to mention worktree path and suggest `raf do <name> --worktree`

## Acceptance Criteria
- [ ] `raf plan --worktree` without project name works (name picker/auto-generation runs)
- [ ] `raf plan my-feature --worktree` works with explicit name (skips name picker)
- [ ] `raf plan --worktree --auto` works (auto-selects generated name)
- [ ] Worktree is created AFTER name is resolved, not before
- [ ] input.md is only saved inside the worktree, never in the main tree
- [ ] Project folder is created at correct relative path inside worktree
- [ ] Planning session runs with cwd set to worktree root
- [ ] Planning artifacts are committed in the worktree branch
- [ ] Success message mentions the worktree path and suggests `--worktree` flag for `raf do`
- [ ] Without `--worktree`, behavior is unchanged
- [ ] Failed planning cleans up the worktree (new project only)
- [ ] Compatible with `--auto` and `--model` flags
- [ ] `raf plan --amend <project> --worktree` resolves project from worktree directory
- [ ] `raf plan --amend <project> --worktree` with no worktree shows helpful error
- [ ] Amend flow reads existing plans/state from inside the worktree
- [ ] New plan files from amend are committed in the worktree branch
- [ ] Amend does NOT attempt to create or clean up the worktree

## Notes
- The project folder path inside the worktree should be identical to what it would be in the main repo (e.g., `<worktree>/RAF/020-my-feature/plans/`)
- The interactive Claude session needs to run with its working directory set to the worktree root so Claude sees the correct file paths
- The `commitPlanningArtifacts` function from `src/core/git.ts` should work inside the worktree since git operations are branch-aware
- For amend, `resolveProjectIdentifierWithDetails()` from `src/utils/paths.ts` likely needs a way to point at the worktree's RAF directory instead of the main repo's. This could be an optional parameter or a wrapper that computes the worktree RAF path
- The project number still comes from the main repo's RAF directory (to maintain sequential numbering), but the project folder itself only exists in the worktree
- The editor already uses a temp file (`os.tmpdir()`), so nothing touches the main tree before the worktree is created
- Reference existing plan command at `src/commands/plan.ts` for the current flow
