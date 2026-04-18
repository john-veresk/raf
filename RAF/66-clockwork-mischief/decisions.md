# Project Decisions

## For Claude aliases like `opus`, what should RAF use as the source of truth for the displayed full model ID?
Use Claude CLI defaults, not a pinned RAF mapping. If RAF is configured with `opus`, it should reflect whatever model Claude CLI currently resolves `opus` to.

## When Codex returns `usage_limit_reached`, what should RAF trust for the reset time and wait behavior?
Trust the CLI/API timestamp and show that exact provider-reported time.

## Should RAF retry exactly at the provider-reported reset timestamp, or keep an internal safety buffer?
Retry exactly at the provider-reported reset timestamp.

## If RAF cannot determine a concrete full model ID from the provider, how should it display configured aliases?
Fall back to the configured alias itself. Apply the same rule across Claude and Codex harnesses; do not expand aliases to guessed pinned full IDs.
