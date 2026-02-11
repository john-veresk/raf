# Project Decisions

## How should the model be displayed on the task line?
On the task line, before the timer, in parentheses like `(sonnet)` or `(opus)`. Show in all modes, not just verbose.

## Should the displayed model be the requested model or actual model(s) from result?
Show the requested model (from effort resolution), not actual models from the result's modelUsage field.

## Should we replace RAF's local cost calculation with Claude's native cost or keep local as fallback?
Replace entirely. Use Claude CLI's `total_cost_usd` and per-model `costUSD` from the result event.

## Should we keep the pricing config after switching to Claude's native cost?
Remove pricing config (`pricing.*` keys) and all local cost calculation code entirely.

## What should happen with the rate limit estimation feature?
Remove it entirely. Remove `showRateLimitEstimate` from display config, remove `rateLimitWindow` config, remove `sonnetTokenCap`, and remove all rate limit percentage calculation and display code.

## How should planning session resume work?
Add a `--resume` flag to `raf plan` that launches `claude -r` (interactive session picker) from the correct worktree CWD. Minimal approach: just pass `--resume` to Claude CLI without re-injecting system prompts.

## Why don't planning sessions appear in `claude -r`?
Sessions ARE persisted (`.jsonl` files exist), but they're stored under the worktree path key (e.g., `~/.claude/projects/-Users-...-worktrees-RAF-project/`). Running `claude -r` from the main repo looks under a different project directory. Fix: ensure `--resume` launches from the worktree path.
