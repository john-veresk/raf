# Project Decisions

## Should short model names (sonnet, haiku, opus) still be supported alongside full model IDs?
Both supported. Keep short names as aliases and also accept full model IDs like claude-opus-4-5-20251101.

## How should full model IDs be validated?
Regex pattern. Validate that full IDs match a pattern like claude-{family}-{version} (e.g., claude-opus-4-5-20251101).

## Should default config values stay as short names or change to full model IDs?
Keep short names. Defaults stay as 'opus', 'sonnet', 'haiku' - simple and auto-resolve to latest.

## How should name generation call Claude CLI to avoid registering a session?
Use the same spawn-based approach as `raf do` (claude-runner.ts) but without the `--dangerously-skip-permissions` flag. Use `spawn` with `-p` flag for non-interactive print mode. Additionally, use the `--no-session-persistence` flag which prevents sessions from being saved to disk.

## What token usage data is available from Claude CLI?
Claude CLI provides comprehensive token data in both `--output-format json` and stream-json `result` events:
- `total_cost_usd`: Total cost in USD (already calculated by Claude CLI)
- `usage.input_tokens`, `usage.output_tokens`, `usage.cache_creation_input_tokens`, `usage.cache_read_input_tokens`
- `modelUsage.<model-id>`: Per-model breakdown with `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `costUSD`
- `duration_ms`, `duration_api_ms`: Timing info

## Where should token reports be displayed?
Console output only. Print token counts and cost estimates to terminal after each task and at the end (total).

## Should pricing be hardcoded or configurable?
Configurable in raf config, with current prices as defaults.

## Should we use Claude CLI's built-in total_cost_usd or compute our own?
Compute own price from token counts × configurable prices. CLI's total_cost_usd doesn't work for subscription users.

## How should task execution capture token counts?
Switch all task execution to stream-json mode (already used in verbose mode). Parse the `result` event for usage data. Non-verbose mode suppresses tool display but still uses stream-json format to capture tokens.

## How should verbose mode toggling during execution work?
Keypress listener on process.stdin. Since all execution uses stream-json after task 03, toggling is purely a display concern — whether tool-use lines are printed or suppressed. Node's event loop can handle stdin events and child process output concurrently.

## Which key toggles verbose mode?
Tab key. Press Tab during task execution to toggle verbose display on/off.

## How detailed should the raf config README section be?
Brief + examples. Command usage, 1-2 basic config examples, mention that `raf config` launches an interactive Claude session for help. Keep it concise like other command sections in the README.

## Should CLAUDE.md mention README update requirements more explicitly?
Yes. Add a note about always updating README when adding/changing CLI commands, API changes, or important features (like worktrees, config).
