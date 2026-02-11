# Task: Add 5h Window Rate Limit Estimation + Plan Session Token Tracking

## Objective
Add an estimated percentage of the 5-hour rate limit window consumed, displayed after each task and in the grand total summary. Also add token usage tracking and display for `raf plan` interactive sessions.

## Dependencies
02

## Context
Anthropic's subscription plans use a shared credit pool per 5-hour window. The pool is measured in cost-weighted credits, not raw token count. Heavier models (Opus) consume the pool faster than lighter ones (Haiku) in proportion to their API pricing ratios. Users need visibility into how much of their 5-hour window they've consumed during a RAF session.

The baseline is 88,000 Sonnet-equivalent tokens per 5h window. All token usage is normalized to Sonnet-equivalent tokens using the API pricing ratios:
- Haiku input/output costs ~1/3 of Sonnet → 1 Haiku token ≈ 0.33 Sonnet tokens
- Opus input/output costs ~1.67× of Sonnet → 1 Opus token ≈ 1.67 Sonnet tokens
- Cache read/create tokens follow the same model-specific pricing ratios

## Requirements

### Rate Limit Estimation (raf do)
- Convert all token usage to "Sonnet-equivalent tokens" using the configured pricing ratios
- The conversion formula: `sonnetEquivalentTokens = actualCost / sonnetCostPerToken` (where sonnet cost per token is derived from the configured Sonnet pricing)
- **Per-attempt model awareness**: task 08 introduces per-task model selection and retry escalation (a task may start with haiku and retry with sonnet/opus). Cost and rate limit calculations must use the actual model that ran each attempt, not a single model for the whole task. This is already handled if cost is calculated per-attempt (task 02), but the rate limit conversion must also use the correct per-attempt pricing
- Display estimated 5h window percentage after each task (alongside existing token summary)
- Display cumulative 5h window percentage in the grand total summary
- New config keys under `display` section:
  - `display.showRateLimitEstimate` (boolean, default: `true`) — toggle showing the % estimate
  - `display.showCacheTokens` (boolean, default: `true`) — toggle showing cache token counts in summaries
- New config key for the baseline cap:
  - `rateLimitWindow.sonnetTokenCap` (number, default: `88000`) — the Sonnet-equivalent token cap for the 5h window
- The percentage is a rough estimate — make this clear in the display (e.g., "~42% of 5h window")

### Token Tracking for Plan Sessions (raf plan)
- After the `raf plan` interactive session ends, display a token usage summary (input/output tokens, cache, estimated cost, 5h window %)
- Approach: Claude CLI saves session data to `~/.claude/projects/<escaped-path>/<session-id>.jsonl` — each assistant message entry contains usage data (input_tokens, output_tokens, cache tokens, model name)
- Pass `--session-id <uuid>` to `runInteractive()` so we know exactly which session file to read after the session ends
- After `runInteractive()` returns, locate and parse the session JSONL file to extract and accumulate all usage data from assistant message entries
- The session file path is `~/.claude/projects/<escaped-project-path>/<session-id>.jsonl` where the project path is escaped by replacing `/` with `-`
- Reuse the existing `TokenTracker` and display formatters to show the summary
- This also applies to `raf plan --amend` sessions

## Implementation Steps

### Rate Limit Estimation
1. Add new config types: `display` section with `showRateLimitEstimate` and `showCacheTokens` booleans; `rateLimitWindow` section with `sonnetTokenCap` number
2. Add defaults to `DEFAULT_CONFIG`, validation rules, and config accessor helpers
3. Update config-docs.md with the new keys
4. Implement the Sonnet-equivalent conversion in `TokenTracker` — the simplest approach: use the total estimated cost (already calculated) divided by the Sonnet cost-per-token to get Sonnet-equivalent tokens
5. Add a method to `TokenTracker` to compute cumulative 5h window percentage
6. Update `formatTaskTokenSummary()` to optionally append the window percentage
7. Update `formatTokenTotalSummary()` to optionally show the cumulative window percentage
8. Respect the `display.showRateLimitEstimate` and `display.showCacheTokens` config flags in the formatters

### Plan Session Token Tracking
9. Modify `runInteractive()` in `claude-runner.ts` to accept an optional `sessionId` parameter and pass it as `--session-id <uuid>` to the Claude CLI spawn
10. In `plan.ts` (both plan and amend flows), generate a UUID before calling `runInteractive()` and pass it
11. Create a utility to locate and parse the Claude session JSONL file: read `~/.claude/projects/<escaped-path>/<session-id>.jsonl`, extract usage data from all assistant message entries, and accumulate into a `UsageData` structure
12. After `runInteractive()` returns in `plan.ts`, call the session parser, feed results to `TokenTracker`, and display the summary using existing formatters
13. Handle edge cases: session file not found (Claude CLI may change storage), malformed entries, zero usage

### Tests
14. Add tests for the conversion logic, display formatting, and session file parsing

## Acceptance Criteria
- [ ] After each task, the token summary includes `~X% of 5h window` when enabled
- [ ] Grand total summary includes cumulative `~X% of 5h window` when enabled
- [ ] Percentage correctly reflects cost-weighted usage (Opus tasks consume more % than Haiku tasks for same raw token count)
- [ ] Multi-model tasks (retry escalation) correctly account for different models across attempts in both cost and rate limit calculations
- [ ] `display.showRateLimitEstimate: false` hides the percentage
- [ ] `display.showCacheTokens: false` hides cache read/create token counts from summaries
- [ ] `rateLimitWindow.sonnetTokenCap` correctly adjusts the denominator
- [ ] Config validation accepts the new keys
- [ ] Config docs updated with new keys and explanation
- [ ] After `raf plan` interactive session, a token usage summary is displayed
- [ ] After `raf plan --amend` interactive session, a token usage summary is displayed
- [ ] Session file parsing handles missing/malformed files gracefully (warn, don't crash)
- [ ] Tests cover the conversion math, display toggling, and session file parsing

## Notes
- The percentage is inherently an estimate — the actual Anthropic rate limit algorithm may differ. The display should communicate this (tilde prefix).
- The conversion can be simplified by reusing the already-computed dollar cost: `sonnetEquivalentTokens = totalCost / ((sonnetInputPrice + sonnetOutputPrice) / 2M)`. But a more accurate approach would normalize input and output tokens separately since they have different price ratios. Consider which approach is more appropriate.
- This task depends on task 02 (fix mixed-attempt cost) because accurate cost calculation is the foundation for accurate percentage estimation.
- Task 08 introduces per-task model selection and retry escalation (cheaper model on first attempt, ceiling model on retry). The per-attempt cost calculation from task 02 already handles different models per attempt via `modelUsage`, but the Sonnet-equivalent conversion for rate limit % must also respect per-attempt model differences. Since conversion is derived from cost (which is already per-attempt), this should work naturally — but verify with a test case covering a multi-model retry scenario.
