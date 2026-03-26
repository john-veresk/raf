# Project Decisions

## Should `pushMainOnComplete` push to remote only when NOT in worktree mode, or also in worktree mode?
Both modes. In non-worktree mode: push main after completion. In worktree mode: after merge action completes, also push main to remote.

## Should `mainBranchName` config replace `detectMainBranch()` everywhere or only the new feature?
Drop the `mainBranchName` config field entirely. Use existing `detectMainBranch()` auto-detection for the new push-on-complete feature.

## In non-worktree mode, should push target the current branch or explicitly detect main?
Push current branch. Rename the config field to `pushOnComplete` (not `pushMainOnComplete`) since it's not necessarily main.

## What should the default value for `pushOnComplete` be?
`false` — opt-in behavior.
