# Outcome: Add Fast Mode to Model Config

## Summary

Extended ModelEntry with a `fast?: boolean` option and wired it to Claude CLI invocations via `--settings '{"fastMode": true}'`. Codex does not support fast mode — documented accordingly.

## Changes Made

- **`src/types/config.ts`**: Added `fast?: boolean` to `ModelEntry` interface
- **`src/core/runner-types.ts`**: Added `fast?: boolean` to `RunnerConfig` interface
- **`src/utils/config.ts`**: Added `fast` to `VALID_MODEL_ENTRY_KEYS`, added boolean validation in `validateModelEntry()`, added merge support in `mergeModelEntry()`
- **`src/core/claude-runner.ts`**: Store `fast` from config; pass as `--settings '{"fastMode": true}'` in interactive, resume, and non-interactive (stream-json) modes
- **`src/commands/plan.ts`**: Pass `fast` from ModelEntry through to `createRunner()` (3 call sites)
- **`src/commands/config.ts`**: Pass `fast` from ModelEntry through to `createRunner()`
- **`src/commands/do.ts`**: Pass `fast` from ModelEntry through to `createRunner()`
- **`src/prompts/config-docs.md`**: Added `fast` to ModelEntry shape, added "Fast Mode" section with description, example, and usage guidance

## CLI Mechanism

- **Claude CLI**: `--settings '{"fastMode": true}'` — enables fast mode via inline settings JSON
- **Codex CLI**: Not supported — documented as Claude-only feature

## Acceptance Criteria Status

- [x] ModelEntry interface includes `fast?: boolean`
- [x] Claude CLI invocations include the fast flag when configured (`--settings '{"fastMode": true}'`)
- [x] Codex CLI invocations — documented as unsupported (Codex has no fast mode equivalent)
- [x] Config validation accepts `fast: true/false` on model entries (boolean type check)
- [x] No fast flag passed when not configured — guarded by `if (this.fast)`
- [x] config-docs.md documents the fast option with examples

<promise>COMPLETE</promise>
