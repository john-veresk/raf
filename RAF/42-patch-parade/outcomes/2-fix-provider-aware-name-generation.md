# Outcome: Fix Provider-Aware Name Generation

## Summary

Threaded the provider parameter through the name generation pipeline so `raf plan --provider codex` spawns the Codex binary with the correct Codex model for project name generation.

## Changes Made

### `src/utils/name-generator.ts`
- Added `provider` parameter to `runClaudePrint()`, `callSonnetForName()`, `callSonnetForMultipleNames()`, `generateProjectName()`, and `generateProjectNames()`.
- `runClaudePrint()` now uses `getProviderBinaryName(provider)` instead of hardcoded `'claude'` for the spawn binary.
- `runClaudePrint()` now passes `provider` to `getModel('nameGeneration', provider)` for provider-aware model resolution.
- Imported `getProviderBinaryName` from `runner-factory` and `HarnessProvider` type.

### `src/commands/plan.ts`
- Passed `provider` to `getModel('nameGeneration', provider)` for the status log message.
- Passed `provider` to `generateProjectNames(cleanInput, provider)`.

### `tests/unit/name-generator.test.ts`
- Added test: codex provider spawns the `codex` binary with `gpt-5.3-codex` model.
- Added test: claude provider spawns the `claude` binary.

## Acceptance Criteria

- [x] `raf plan --provider codex` uses the Codex binary for generated project names.
- [x] Name generation uses the provider-appropriate configured model.
- [x] Claude name generation behavior remains unchanged.
- [x] A focused regression test covers the new provider-aware path.
- [x] All tests pass (4 pre-existing failures unrelated to this change).

<promise>COMPLETE</promise>
