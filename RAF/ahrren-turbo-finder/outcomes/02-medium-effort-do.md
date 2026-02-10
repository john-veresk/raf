# Outcome: Set medium reasoning effort for `raf do` execution

## Summary

Configured `raf do` to spawn Claude CLI processes with `CLAUDE_CODE_EFFORT_LEVEL=medium` environment variable, reducing reasoning overhead during automated task execution while preserving default (high) effort for interactive planning sessions.

## Key Changes

### `src/core/claude-runner.ts`
- Added optional `effortLevel` field (`'low' | 'medium' | 'high'`) to `ClaudeRunnerOptions` interface
- In `run()`: when `effortLevel` is set, spreads `process.env` with `CLAUDE_CODE_EFFORT_LEVEL` override; otherwise passes `process.env` directly
- In `runVerbose()`: same env injection logic as `run()`
- `runInteractive()` is unchanged — uses `process.env` as-is (no effort override for planning sessions)

### `src/commands/do.ts`
- Passes `effortLevel: 'medium'` in both `claudeRunner.run()` and `claudeRunner.runVerbose()` calls during task execution

### `tests/unit/claude-runner.test.ts`
- Added 6 tests in new `effort level` describe block:
  - Verifies `CLAUDE_CODE_EFFORT_LEVEL` is set in env for `run()` when effortLevel provided
  - Verifies `CLAUDE_CODE_EFFORT_LEVEL` is set in env for `runVerbose()` when effortLevel provided
  - Verifies env is `process.env` directly (no override) when effortLevel not provided in `run()`
  - Verifies env is `process.env` directly (no override) when effortLevel not provided in `runVerbose()`
  - Verifies all three levels (low, medium, high) work correctly
  - Verifies other env vars (e.g., PATH) are preserved when effortLevel is set

### `tests/unit/claude-runner-interactive.test.ts`
- Added 1 test verifying `runInteractive()` does NOT set `CLAUDE_CODE_EFFORT_LEVEL` in its env

## Test Results

All 45 test suites pass (978 tests total, 0 failures).

<promise>COMPLETE</promise>
