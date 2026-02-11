# Project Decisions

## Where should the 5h window rate limit percentage be displayed?
Per-task + total — show running 5h window % after each task AND in the final total summary.

## Should the Sonnet baseline cap (88,000) be configurable?
Yes, configurable — add a config key so users can adjust the Sonnet-equivalent token cap.

## Should display toggles (rate limit %, cache tokens) be top-level or nested?
Nested under `display` section — e.g., `display.showRateLimitEstimate: true`, `display.showCacheTokens: true`.

## What approach for fixing mixed-attempt cost underreporting?
Per-attempt cost — calculate cost for each attempt independently, then sum. Each attempt uses per-model if available, aggregate-fallback otherwise.

## Should the branch name be configurable for worktree mode?
No — the user clarified that "branch name" referred to the **main branch** (main, master, etc.) that gets pushed/pulled, not the worktree feature branch. Main branch should be auto-detected from `origin/HEAD`.

## How should RAF version be displayed in `raf do` logs?
Single combined line at the start of execution — e.g., `RAF v2.3.0 | Model: claude-opus-4-6 | Effort: high`.

## Should `claudeCommand` be removed entirely or deprecated?
Remove entirely — always use 'claude' as the command name, remove the config key, accessor, and all references.

## Does removing `claudeCommand` also fix the PR #4 review comment about `raf config` fallback?
Yes — removing `claudeCommand` means `getClaudePath()` will hardcode 'claude', so it can't throw due to broken config. No separate task needed; verification included in the removal task.

## Should push-main and pull-main be controlled by one config key or two?
Single key — `syncMainBranch: true` controls both pushing main before PR and pulling main before worktree creation.

## For the main branch: config key or auto-detect?
Auto-detect from `origin/HEAD` — no config key needed.

## What scope for the README sync task?
Critical only — fix `--merge` flag references, document the post-execution picker, and document PR creation from worktree. Defer medium/low items.
