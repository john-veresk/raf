# Project Decisions

## Should the spark alias be removed entirely or remapped to a different model?
Remove entirely. Delete 'spark' from CodexModelAlias type, MODEL_ALIAS_TO_FULL_ID, tier ordering, VALID_CODEX_MODEL_ALIASES, and any other references including config-docs.md.

## Should worktree cleanup be limited to the plan command or broader?
Plan command only. Remove worktree references only from PlanCommandOptions interface and the plan command action handler.

## Should token usage from multiple turn.completed events be summed or kept as last-only?
Sum all token fields. Accumulate inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, and totalCostUsd across all turn.completed events in both claude-runner.ts and codex-runner.ts.

## Where should effort appear in the compact display status line?
Inside parentheses: (sonnet, medium, fast) - effort between model and fast flag.

## What should happen with fast mode for Codex harness?
Research whether Codex CLI supports fast mode. If it does, wire it up. If not, remove the fast setting entirely from Codex-related config paths (don't just warn - clean it up).

## Which prompt files should be optimized?
All three: planning.ts, execution.ts, and amend.ts.
