---
effort: medium
---
# Task: Show Codex Token Summaries Without Fake Cost

## Objective
Update RAF’s post-execution token summaries so Codex runs show exact token counts while omitting dollar cost when no exact price is available.

## Context
Once Codex token usage is captured, RAF’s current summary format will otherwise show `Cost: $0.00`, which reads like an exact price instead of “unknown”. The user explicitly wants input/output tokens surfaced, but only wants price shown when RAF can source it exactly.

## Dependencies
2

## Requirements
- Show Codex input/output token summaries after each task and in the grand total summary.
- Do not show `$0.00` when Codex cost is unavailable.
- Continue showing exact dollar cost for Claude runs exactly as RAF does today.
- Avoid estimated pricing for Codex entirely.
- Make the “cost unavailable” behavior data-driven so future providers with token-only usage can reuse it.
- Update README and any config/docs references affected by the new provider-specific summary behavior.

## Implementation Steps
1. Update token summary formatting in [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/utils/terminal-symbols.ts) so cost output is conditional on exact-cost availability instead of always rendering a dollar value.
2. Adjust any supporting token-tracker or usage-data helpers to preserve the distinction between exact zero and unavailable cost.
3. Wire the updated summary behavior through [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/commands/do.ts) for both per-task and grand-total reporting.
4. Update README and related docs to explain that Codex currently reports token counts post-run, while dollar cost is shown only when the CLI provides an exact value.
5. Add tests covering Codex token-only summaries and regression tests proving Claude still shows exact cost.

## Acceptance Criteria
- [ ] Codex task summaries show input/output tokens after execution.
- [ ] Codex grand totals show input/output tokens after execution.
- [ ] Codex summaries omit dollar cost when exact price is unavailable.
- [ ] Claude summaries still show exact dollar cost.
- [ ] No summary path prints a misleading `$0.00` for unknown Codex cost.
- [ ] README reflects the current Codex token-only limitation.
- [ ] Updated formatter and command-output tests pass.

## Notes
- If Codex later adds an exact per-run dollar-cost field, the display should start showing it through the same availability-aware path instead of introducing provider-specific formatting branches.
