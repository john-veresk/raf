---
effort: medium
---
# Task: Wire --provider CLI Flag Through to Runner and Model Resolution

## Objective
Make the `--provider` CLI flag actually work by reading `options.provider` and passing it to `createRunner()`, `resolveEffortToModel()`, and `resolveModelOption()`.

## Context
Both `do.ts` and `plan.ts` declare a `--provider` option via Commander, but `options.provider` is never read. All calls to `createRunner()` omit the `provider` field, and all calls to `resolveEffortToModel()` omit the provider parameter. The flag is completely inert.

## Dependencies
1

## Requirements
- Read `options.provider` from Commander options in both `do.ts` and `plan.ts`
- Pass provider to `createRunner({ model, provider })` in all call sites
- Pass provider to `resolveEffortToModel(effort, provider)` in `do.ts` (line ~125 where effort mapping happens)
- Pass provider to `resolveModelOption()` — this function may need a new parameter added to accept provider
- Ensure `resolveModelOption` in `src/utils/validation.ts` can handle provider-aware model resolution (it currently returns `ClaudeModelName` — may need to return a more general type or use the existing `parseModelSpec` logic)

## Implementation Steps
1. Read `src/commands/do.ts` — find all `createRunner()` and `resolveEffortToModel()` calls
2. Read `src/commands/plan.ts` — find all `createRunner()` calls
3. Read `src/utils/validation.ts` — understand `resolveModelOption()` signature
4. Read `src/core/runner-factory.ts` — confirm `RunnerConfig` already has `provider` field
5. In `do.ts`:
   - Read `options.provider` at the top of `runDoCommand`
   - Pass `provider` to `resolveModelOption()` (update its signature if needed)
   - Pass `provider` to all `createRunner()` calls: `createRunner({ model, provider })`
   - Pass `provider` to all `resolveEffortToModel()` calls
6. In `plan.ts`:
   - Read `options.provider` in the action handler
   - Pass through to `runPlanCommand`, `runAmendCommand`, `runResumeCommand`
   - Pass `provider` to all `createRunner()` calls
   - Pass `provider` to `resolveModelOption()` if applicable
7. Update `resolveModelOption()` signature if needed to accept optional provider
8. Build and verify no type errors

## Acceptance Criteria
- [ ] `raf do --provider codex` creates a `CodexRunner` instead of `ClaudeRunner`
- [ ] `raf plan --provider codex` creates a `CodexRunner` for planning sessions
- [ ] `resolveEffortToModel` uses codex effort mapping when `--provider codex` is passed
- [ ] TypeScript compiles without errors

## Notes
- The `RunnerConfig` type in runner-factory.ts already supports `provider` — just need to pass it through
- `resolveEffortToModel` in config.ts already accepts an optional `provider` parameter — just not being called with one from the commands
