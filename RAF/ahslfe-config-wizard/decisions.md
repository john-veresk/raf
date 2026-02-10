# Project Decisions

## Config scope: should ALL hardcoded values become configurable, or only user-facing settings?
User-facing only. Only settings users care about: models, effort, timeouts, retries, worktree, commit format. Internal poll intervals, grace periods, and char limits stay hardcoded.

## Model configuration: per-scenario or simpler approach?
Per-scenario models. Each scenario gets its own model key, e.g. models.plan: 'opus', models.execute: 'opus', models.nameGeneration: 'sonnet', etc.

## Commit format: how configurable?
Template string. A template like `{prefix}[{projectId}:{taskId}] {description}` where users can change the prefix ('RAF') and structure.

## `raf config` with no arguments: Claude session or editor?
Claude session. Always start an interactive Claude Sonnet session. User describes what they want in natural language, Claude edits config.

## Reasoning effort: per-scenario or single global?
Per-scenario effort. Each scenario gets its own effort level, e.g. effort.plan: 'high', effort.execute: 'medium', effort.nameGeneration: 'low'.

## Worktree default behavior?
Default off (current). Worktree is opt-in via --worktree flag. Config can flip this to make it default-on.

## Config validation after changes?
Strict validation. Validate schema, reject unknown keys and invalid values. Show errors and don't save bad config.

## Config file name?
raf.config.json — keep current name. Path: ~/.raf/raf.config.json

## `raf config` Claude session mode?
Interactive TTY. Spawn an interactive Claude Sonnet session (like planning mode). User can have a conversation, ask questions, make multiple changes.

## Config documentation location?
Bundled in package. Ship as part of the npm package (e.g., src/prompts/config-docs.md). Versioned with the code, injected at runtime.

## Should there be a `raf config --reset`?
Yes, with confirmation prompt before deleting the config file (falling back to defaults).
