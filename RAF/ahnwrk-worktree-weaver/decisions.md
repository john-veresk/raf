# Project Decisions

## Worktree auto-discovery: when a user picks a worktree project from the regular `raf do` picker, should RAF automatically switch to worktree mode?
Yes — auto-switch to worktree mode. Picking a worktree project automatically behaves as if `--worktree` was passed (runs in worktree path, shows post-action picker after).

## What model should be used to generate PR descriptions?
Sonnet. Better quality summaries justify the slightly higher cost.

## PR description structure: Summary (from proofread input.md) → Key Decisions (from decisions.md) → What Was Done (from outcomes) → Test Plan?
Yes, this structure works.

## Should Co-Authored-By removal apply to ALL commits, or be configurable?
Never include it. Add explicit instruction in execution prompt to not add Co-Authored-By trailers.

## How should worktree projects appear in the regular `raf do` picker?
Mixed list with label. Show all projects in one sorted list, with worktree projects marked (e.g. `abcdef my-feature (2/5 tasks) [worktree]`).

## For the `\n` issue in PR descriptions: investigate or known cause?
Investigate and fix. Find the root cause of the `\n` escaping in the PR creation pipeline.
