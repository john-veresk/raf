# Project Decisions

## How should the --worktree flag be persisted so `raf do` knows the project uses worktree mode?
By naming convention - if a worktree directory matching `<repo>-<project id>` exists in `../<repo>-worktrees/`, the project is in worktree mode. No config file needed; existence of the worktree directory is the signal.

## What branch name format should be used for the worktree branch?
Full project folder name (e.g., `020-worktree-weaver`) - matches the project folder exactly.

## Should planning also happen inside the worktree directory, or only execution?
Both plan and execute in worktree. Create worktree first, then run planning inside it. Plans, decisions, input all live in the worktree.

## What should happen during auto-merge on project completion if there are merge conflicts?
~~Fast-forward only, warn on conflict. Only auto-merge if fast-forward is possible. If not, print a warning and leave the branch for manual merge.~~ UPDATED: Merge is controlled by `--merge` flag. Try ff first, fall back to merge-commit. On conflicts, run `git merge --abort` and warn the user to merge manually.

## Should the project folder structure inside the worktree mirror the same relative path?
Yes, same relative path. The worktree is a full repo clone. Project folder lives at the same `RAF/020-project-name/` path inside the worktree, so Claude works normally.

## Should the worktree directory be cleaned up after a successful merge?
~~Auto-cleanup after merge. Run `git worktree remove` and delete the worktree directory after successful merge.~~ UPDATED: No cleanup after merge. Worktrees persist indefinitely. No `raf cleanup` command needed.

## For `raf do` without --worktree flag: should it auto-detect worktree mode?
Require `--worktree` flag explicitly. Since it allows RAF to `cd` into the worktree dir and find project plans there. Both `raf plan` and `raf do` need the flag.

## When should the git worktree be created during `raf plan --worktree`?
~~Require the project name upfront when `--worktree` flag is present.~~ UPDATED: Project name is NOT required upfront for `--worktree`. The normal name picker/auto-generation flow works. The editor uses a temp file (never touches the main tree), so the worktree is created AFTER the project name is known. Flow: editor (temp file) → name resolution → create worktree → create project folder inside worktree → save input.md inside worktree.

## Should `raf do --worktree` validate the worktree exists before execution?
Yes, validate and fail with a helpful message. Check that: (1) the worktree directory exists, (2) the project folder and plan files exist inside the worktree. If not, error with guidance like "No worktree found. Did you plan with --worktree?"

## Should `raf status` show worktree information?
No, keep status output simple. No worktree-specific display.

## Should `raf do --worktree` support multiple projects?
No, `--worktree` only supports a single project at a time. Multi-project execution is not compatible with worktree mode.

## How should the CLI syntax work for `raf plan --worktree`?
~~Name is required when `--worktree` is used.~~ UPDATED: Name is optional, same as non-worktree mode. `raf plan --worktree` works without a name — the name picker/auto-generation runs as normal. `raf plan my-feature --worktree` also works (skips name picker). The `--auto` flag works the same (auto-selects first generated name).

## Should planning artifacts be committed in worktree mode?
Yes, commit in the worktree branch. Same commit behavior as today, but the commit lands in the worktree's branch instead of the main branch.

## Where should worktree directories be stored?
In `~/.raf/worktrees/<repo-basename>/<project-id>`, where `<repo-basename>` is the basename of the repo root directory (e.g., `myapp` from `/Users/me/projects/myapp`), and `<project-id>` is the full project folder name (e.g., `020-worktree-weaver`). This keeps worktrees outside the repo entirely — no `.gitignore` changes needed.

## Should the parent `<repo>` directory under `~/.raf/worktrees/` be cleaned up when empty?
No. Leave `~/.raf/worktrees/<repo>/` in place. No separate cleanup command needed.

## How should `raf plan --amend --worktree` resolve the project identifier?
Resolve from the worktree. Since plans only exist inside the worktree in worktree mode, project identifier resolution should look inside `~/.raf/worktrees/<repo-basename>/` to find the matching project. This is part of task 002 (worktree-plan-command).

## When multiple uncompleted worktree projects are found (for `raf do --worktree` without project identifier), what should happen?
Show an interactive picker (like the existing non-worktree flow) to let the user choose one project.

## Should `raf do --worktree` without a project identifier be a new task or modify existing task 003?
Modify task 003 directly to support optional project identifier with auto-discovery. Keeps related logic together.

## What defines "latest completed project in main tree"?
The project with the highest ID where all tasks are completed (project status = 'completed').

## Should auto-discovery include worktree projects with failed tasks?
Yes, include both pending and failed worktree projects in the picker - they're all "uncompleted".

## If only one uncompleted worktree project is found, should it auto-select?
No, still show the picker/confirmation even for a single project, so the user can cancel.

## Should auto-discovery utility functions be added to task 001 (worktree utilities)?
Yes, add a utility function like `listWorktreeProjects()` to task 001, and have task 003 call it. Keeps worktree scanning logic reusable.

## What should the starting point for worktree scanning be?
Start from "highest completed project in main tree minus 3" instead of "after the latest completed". This accounts for amended projects — e.g., if the highest completed main-tree project is 008, scan worktrees starting from 006 (006, 007, 008, 009, 010, ...). This catches worktrees for projects that were amended after completion and now have new uncompleted tasks.

## Should worktrees be cleaned up after task completion or merge?
No. No cleanup, no deletion of worktree, no prune after task completion. No `raf cleanup` command is needed. Worktrees stay in place indefinitely.

## How should merging work after project completion in worktree mode?
Merge is controlled by a `--merge` flag on `raf do`. When `--merge` is present, attempt merge after all tasks complete. Allow merge-commits (not ff-only). On merge conflicts, notify the user. Without `--merge`, no merge happens.

## Should failed planning still clean up the worktree?
Yes. If planning fails or is interrupted and no plans were created, clean up the worktree that was just created. This is different from post-completion cleanup — it's cleaning up a half-created state.

## Should the worktree removal utility remain in task 001?
Yes. It's still needed for the failed-plan cleanup in task 002. Just remove post-completion cleanup references from task 004.

## Should `--merge` only work with `--worktree`?
Yes. `--merge` is only valid when `--worktree` is also present. Error if used without `--worktree`.

## What should happen on merge conflicts?
Abort the merge (`git merge --abort`) to leave the repo in a clean state, then tell the user to merge manually.
