# Outcome: Fix token usage accumulation for multi-turn executions

## Summary
Implemented cumulative usage merging for streamed execution events so token and cost totals now reflect all `turn.completed`/`result` events in a run rather than only the last event.

## Key Changes Made
- Added shared merge utility in `src/utils/token-tracker.ts`:
  - New `mergeUsageData(existing, incoming)` handles first-event initialization and incremental accumulation.
  - Sums `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, and `totalCostUsd`.
  - Merges `modelUsage` per model with the same accumulation behavior.
  - Handles undefined/missing fields defensively to avoid `NaN`/crashes.
- Updated runners to accumulate usage instead of overwrite:
  - `src/core/codex-runner.ts`: replaced both `usageData = rendered.usageData` assignments with `mergeUsageData(...)`.
  - `src/core/claude-runner.ts`: replaced both `usageData = rendered.usageData` assignments with `mergeUsageData(...)`.
- Refactored existing usage aggregation internals to reuse shared merge logic:
  - `accumulateUsage()` now folds through `mergeUsageData`.
  - `TokenTracker.getTotals()` now merges per-task usage via `mergeUsageData`.
- Added/updated tests:
  - `tests/unit/codex-runner.test.ts`: added multi-`turn.completed` accumulation test.
  - `tests/unit/claude-runner.test.ts`: added multi-`result` accumulation test.
  - `tests/unit/token-tracker.test.ts`: added `mergeUsageData` behavior tests, including undefined/missing-field handling.

## Verification
- TypeScript build: `npm run -s build` passed.
- Focused tests passed:
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/token-tracker.test.ts tests/unit/codex-runner.test.ts tests/unit/claude-runner.test.ts`
- Note: default `npm test` invocation in this sandbox attempted Watchman and failed due socket permission restrictions; reran with `--watchman=false`.

## Notes
- No CLI surface/flags changed; README updates were not required.

<promise>COMPLETE</promise>
