# Project Decisions

## Should only effortMapping.low change, or all haiku defaults (e.g., failureAnalysis)?
Only effortMapping.low — change low-effort task default from haiku to sonnet. Leave failureAnalysis and other models as-is.

## What other config settings need --no-* counterparts?
Only `--worktree` needs a `--no-worktree` counterpart — it's the only boolean config with an existing CLI flag. `autoCommit` and `syncMainBranch` are config-only and don't need CLI negation flags.

## README benefits to highlight
- Smart model selection: RAF estimates task complexity and uses the right model (haiku for simple, opus for complex)
- Automatic PR creation with Claude-generated descriptions summarizing intent, decisions, and outcomes
- Structured decision-making: planning interview captures key decisions as reviewable artifacts
- Context isolation: each task gets fresh context instead of degrading over a long session
- Token efficiency: focused tasks use fewer tokens than long debugging sessions
- Full auditability: input, decisions, plans, and outcomes are all preserved as markdown
