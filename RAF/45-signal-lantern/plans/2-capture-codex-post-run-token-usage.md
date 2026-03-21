---
effort: medium
---
# Task: Capture Codex Post-Run Token Usage

## Objective
Capture Codex input/output token counts from non-interactive execution and carry them through RAF’s post-run usage pipeline.

## Context
Research during planning found that RAF’s Codex path already sees `turn.completed` usage data in `codex exec --json`, and prior local outcome notes show real Codex runs reporting `in`/`out` token counts. However, [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/core/codex-runner.ts) currently returns `usageData: undefined`, so `raf do` cannot include Codex token totals after execution.

## Requirements
- Parse Codex `turn.completed` usage from the JSON stream used by `codex exec --json`.
- Capture at least exact input and output token counts from Codex.
- Preserve compatibility with existing Claude usage tracking.
- Do not invent or estimate dollar cost for Codex.
- Represent missing exact Codex cost as unavailable rather than pretending the value is exact.
- Keep retry accumulation behavior intact so Codex retries still roll up correctly.

## Implementation Steps
1. Extend the Codex stream renderer in [`src/parsers/codex-stream-renderer.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/parsers/codex-stream-renderer.ts) to return structured usage data for `turn.completed` events, not just display text.
2. Update the shared run-result plumbing so [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/core/codex-runner.ts) records Codex usage data from streamed events the same way Claude does.
3. Introduce or refine the usage-data representation so Codex can express exact token counts with no exact dollar-cost value.
4. Ensure token tracking in [`src/utils/token-tracker.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/utils/token-tracker.ts) can accumulate Codex attempts without collapsing “unknown cost” into a misleading exact zero.
5. Add unit tests for Codex usage extraction and runner propagation.

## Acceptance Criteria
- [ ] Codex `turn.completed` input token counts are captured into RAF usage data.
- [ ] Codex `turn.completed` output token counts are captured into RAF usage data.
- [ ] `raf do` receives Codex usage data through the runner result path.
- [ ] Existing Claude usage tests continue to pass unchanged in behavior.
- [ ] Codex cost remains explicitly unavailable unless an exact field is present.
- [ ] Codex retry attempts still accumulate token usage correctly.
- [ ] New Codex renderer/runner tests pass.

## Notes
- Planning research conclusion as of March 21, 2026: current Codex surfaces clearly expose token usage, but exact per-run dollar cost was not confirmed in the `exec --json` path RAF uses.
