# Task: Sync Main Branch Before Worktree/PR Operations

## Objective
Automatically push main to remote before creating a PR and pull main from remote before creating a git worktree, with a configurable toggle.

## Context
When working with worktrees, the worktree is branched from the current state of the main branch. If main is behind the remote, the worktree starts from stale code. Similarly, before creating a PR, the main branch should be pushed to ensure the remote has the latest state for the PR base. Auto-detecting the main branch (from `origin/HEAD`) avoids hardcoding assumptions about branch naming.

## Requirements
- Before creating a worktree (`raf plan --worktree` or `raf do --worktree`): pull the main branch from remote to ensure the worktree starts from the latest code
- Before creating a PR (post-execution "Create PR" action): push the main branch to remote so the PR base is up to date
- Auto-detect the main branch name from `refs/remotes/origin/HEAD` (the same detection logic used in `pull-request.ts` via `detectBaseBranch()`)
- New config key: `syncMainBranch` (boolean, default: `true`)
- When `syncMainBranch` is `false`, skip both push and pull operations
- Handle failures gracefully: if push/pull fails (e.g., no remote, auth issues), warn but don't block the operation

## Implementation Steps
1. Add `syncMainBranch` config key to `RafConfig` interface, `DEFAULT_CONFIG`, validation, and config-docs.md
2. Add `getSyncMainBranch()` accessor in `src/utils/config.ts`
3. Reuse or extract `detectBaseBranch()` from `src/core/pull-request.ts` into a shared utility (it's already used for PR base detection)
4. Add a `syncMainBranch()` utility function that pulls main before worktree creation
5. Integrate pull into the worktree creation flow in `src/core/worktree.ts` or the calling code in `do.ts`/`plan` command
6. Integrate push into the PR creation flow — before `createPullRequest()` is called, push main
7. Add appropriate logging (info level) when syncing occurs
8. Handle errors: catch failures, log warning, continue with the operation
9. Update config-docs.md

## Acceptance Criteria
- [ ] Main branch is pulled from remote before worktree creation (when `syncMainBranch: true`)
- [ ] Main branch is pushed to remote before PR creation (when `syncMainBranch: true`)
- [ ] Main branch name is auto-detected from `origin/HEAD`
- [ ] `syncMainBranch: false` skips both operations
- [ ] Failures in push/pull produce warnings but don't block the workflow
- [ ] Config validation accepts the new key
- [ ] Config docs updated

## Notes
- `detectBaseBranch()` in `src/core/pull-request.ts` already handles the `origin/HEAD` detection with fallback to `main`/`master`. Reuse this logic rather than duplicating it.
- The pull should only pull the main branch, not the current branch or all branches.
- Be careful about the pull: if the user has uncommitted changes on main, a pull could fail. Consider using `git fetch origin main && git merge --ff-only origin/main` which fails cleanly if main has diverged.
