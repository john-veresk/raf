# Project Decisions

## Should CLAUDE.md also be checked for any references to the migrate command that need cleanup, or is it just code + README?
Also check CLAUDE.md — scan for any mentions of the migrate command and remove them.

## For auto-detection: should `--resume` automatically detect if a project lives in a worktree (and use worktree mode) even without `--worktree` flag?
Yes, auto-detect. Search both main repo and worktrees. If found in a worktree, auto-enable worktree mode. `--worktree` flag is optional.

## If the project exists in both the main repo AND a worktree, which should take priority when --worktree is not specified?
Worktree first. Prefer the worktree copy since it likely has the latest state (worktree is the active working copy).
