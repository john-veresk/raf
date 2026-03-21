---
effort: medium
---
# Task: Fix token usage accumulation for multi-turn executions

## Objective
Merge successive `usageData` payloads from `turn.completed` events instead of overwriting them, so per-task and run-level token summaries reflect actual usage.

## Context
When multiple `turn.completed` events are emitted in a single `codex exec --json` or `claude --output-format stream-json` run (e.g., tool-driven multi-turn executions), the current code does `usageData = rendered.usageData` which overwrites prior usage and keeps only the last turn's tokens. This makes token summaries undercount actual usage.

## Requirements
- In both `codex-runner.ts` and `claude-runner.ts`, accumulate token counts across all `turn.completed` events
- Sum numeric fields: `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `totalCostUsd`
- For `modelUsage` (if present), merge per-model entries similarly
- Handle the case where `usageData` is initially undefined (first event) vs subsequent events

## Implementation Steps
1. Create a `mergeUsageData` utility function (either inline in each runner or in a shared utility like `src/utils/token-tracker.ts`):
   - If existing is undefined, return the new data
   - Otherwise, sum all numeric fields from both
   - Merge `modelUsage` maps if present
2. In `src/core/codex-runner.ts` (lines ~265-267 and ~287-289):
   - Replace `usageData = rendered.usageData` with `usageData = mergeUsageData(usageData, rendered.usageData)`
3. In `src/core/claude-runner.ts` (lines ~387-389 and ~409-411):
   - Replace `usageData = rendered.usageData` with `usageData = mergeUsageData(usageData, rendered.usageData)`
4. Check the `UsageData` interface in the types to understand all fields that need merging

## Acceptance Criteria
- [ ] Multi-turn executions report cumulative token counts, not just the last turn
- [ ] Single-turn executions still work correctly (no regression)
- [ ] TypeScript compiles without errors
- [ ] The merge function handles undefined/missing fields gracefully
