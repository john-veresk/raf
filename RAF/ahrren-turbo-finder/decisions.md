# Project Decisions

## For the worktree resolution fix: should `raf do turbo-finder` (no --worktree flag) automatically detect and use the worktree project? Or should it still require the --worktree flag but just fix name/ID matching within that flag?
Auto-detect worktrees — `raf do <name>` searches worktrees automatically if not found in main repo, then auto-enables worktree mode.

## For reducing reasoning: which commands should use low reasoning effort?
Only do — Use low reasoning only for task execution (`raf do`), not for planning.

## For worktree auto-detection: when `raf do <name>` finds the project in a worktree, should it also trigger the post-execution action picker (merge/PR/leave) like the --worktree flag does?
Yes, full worktree flow — Auto-detected worktree projects get the same post-action picker as explicitly --worktree projects.

## For the reasoning effort on `raf do`: implementation approach?
Use env var approach — Set `CLAUDE_CODE_EFFORT_LEVEL=medium` environment variable when spawning Claude processes for task execution.

## What effort level for `raf do`?
Medium — Use `CLAUDE_CODE_EFFORT_LEVEL=medium` (not low).

## Given the env var UI bug (GitHub #23604), how should RAF set effort?
Use env var anyway — `CLAUDE_CODE_EFFORT_LEVEL=medium` likely works at the API level despite the `/model` UI not reflecting it. Simplest approach.
