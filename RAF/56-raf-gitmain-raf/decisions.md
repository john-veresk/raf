# Project Decisions

## If worktree creation fails, should `raf plan` fall back or fail?
Warn and fall back to creating the project in the main repo.

## Should `raf plan` have `--worktree` / `--no-worktree` CLI flags?
No. Rely fully on config. No CLI flags for worktree override. Also: if a project already exists in main, the worktree should still be created if enabled in config.

## Should creating a worktree sync the main branch first?
Yes, sync main first (pull latest) before creating the worktree so planning starts from the latest code.

## Where should the project folder live when worktree is enabled?
Worktree only — the project folder lives only inside the worktree. The main repo just has the worktree reference (git worktree list).
