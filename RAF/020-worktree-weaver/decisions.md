# Project Decisions

## How should the --worktree flag be persisted so `raf do` knows the project uses worktree mode?
By naming convention - if a worktree directory matching `<repo>-<project id>` exists in `../<repo>-worktrees/`, the project is in worktree mode. No config file needed; existence of the worktree directory is the signal.

## What branch name format should be used for the worktree branch?
Full project folder name (e.g., `020-worktree-weaver`) - matches the project folder exactly.

## Should planning also happen inside the worktree directory, or only execution?
Both plan and execute in worktree. Create worktree first, then run planning inside it. Plans, decisions, input all live in the worktree.

## What should happen during auto-merge on project completion if there are merge conflicts?
Fast-forward only, warn on conflict. Only auto-merge if fast-forward is possible. If not, print a warning and leave the branch for manual merge.

## Should the project folder structure inside the worktree mirror the same relative path?
Yes, same relative path. The worktree is a full repo clone. Project folder lives at the same `RAF/020-project-name/` path inside the worktree, so Claude works normally.

## Should the worktree directory be cleaned up after a successful merge?
Auto-cleanup after merge. Run `git worktree remove` and delete the worktree directory after successful merge.

## For `raf do` without --worktree flag: should it auto-detect worktree mode?
Require `--worktree` flag explicitly. Since it allows RAF to `cd` into the worktree dir and find project plans there. Both `raf plan` and `raf do` need the flag.

## When should the git worktree be created during `raf plan --worktree`?
Require the project name upfront when `--worktree` flag is present (no interactive name picker needed - name must be provided as argument). Create worktree immediately with the full project folder name as branch, then run planning inside it.

## Should `raf do --worktree` validate the worktree exists before execution?
Yes, validate and fail with a helpful message. Check that: (1) the worktree directory exists, (2) the project folder and plan files exist inside the worktree. If not, error with guidance like "No worktree found. Did you plan with --worktree?"

## Should `raf status` show worktree information?
No, keep status output simple. No worktree-specific display.

## Should `raf do --worktree` support multiple projects?
No, `--worktree` only supports a single project at a time. Multi-project execution is not compatible with worktree mode.

## How should the CLI syntax work for `raf plan --worktree`?
Same as current - project name is the positional argument: `raf plan my-feature --worktree`. Name is required when `--worktree` is used (skip the interactive name picker). The `--auto` flag interaction is that name generation is skipped entirely.

## Should planning artifacts be committed in worktree mode?
Yes, commit in the worktree branch. Same commit behavior as today, but the commit lands in the worktree's branch instead of the main branch.
