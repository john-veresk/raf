# Outcome: Wire reasoningEffort to CLI Invocations

## Summary

Wired the `reasoningEffort` field from ModelEntry config through to actual Claude and Codex CLI invocations. Previously, this field existed in the config type and validation but was never passed to the CLI processes.

## Changes Made

- **`src/core/runner-types.ts`**: Added `reasoningEffort?: string` to `RunnerConfig` interface
- **`src/core/claude-runner.ts`**: Store `reasoningEffort` from config; pass as `--effort <level>` flag in interactive, resume, and non-interactive (stream-json) modes
- **`src/core/codex-runner.ts`**: Store `reasoningEffort` from config; pass as `-c model_reasoning_effort="<level>"` in interactive and exec modes
- **`src/commands/plan.ts`**: Pass `reasoningEffort` from ModelEntry through to `createRunner()` (3 call sites)
- **`src/commands/config.ts`**: Pass `reasoningEffort` from ModelEntry through to `createRunner()`
- **`src/commands/do.ts`**: Pass `reasoningEffort` from ModelEntry through to `createRunner()`

## CLI Flags Used

- **Claude CLI**: `--effort <level>` (discovered via `claude --help`)
- **Codex CLI**: `-c model_reasoning_effort="<level>"` (discovered via codex config.toml format)

## Acceptance Criteria Status

- [x] Claude CLI invocations include reasoning effort flag when configured (`--effort`)
- [x] Codex CLI invocations include reasoning effort flag when configured (`-c model_reasoning_effort`)
- [x] No reasoning effort flag is passed when not configured (undefined/omitted) — guarded by `if (this.reasoningEffort)`
- [x] Existing CLI invocations still work when reasoningEffort is not set — all 1227 tests pass (2 pre-existing failures unrelated)

<promise>COMPLETE</promise>
