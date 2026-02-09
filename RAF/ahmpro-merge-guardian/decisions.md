# Project Decisions

## Amend commit bug: does it fail only with --worktree or also without?
Worktree only. The bug only happens when using --amend --worktree.

## Amend commit bug: suspected root cause?
Needs investigation. Not sure of root cause — the task should investigate the full amend+worktree flow to find the bug.

## Task ID format change: breaking change or backward compatible?
Breaking change. Update everything to new format, no backward compat needed.

## PR creation: what content should the PR body contain?
Input.md, key decisions, and outcomes summary combined.

## PR creation: how should the PR body be generated?
Use Claude (Haiku) to generate a clean PR description from input + decisions + outcomes.

## PR target branch: auto-detect or let user pick?
Auto-detect base. Automatically use the branch the worktree was forked from (usually main).

## Post-execution picker: when should it appear?
Remove --merge flag entirely. Always show picker BEFORE worktree tasks execute.

## Post-execution picker: flow after task completion?
Pre-pick + auto. Pick before execution, auto-perform after success, skip on failure.
