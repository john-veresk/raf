# Task 2: Abstract CLI Runner Interface

## Summary
Extracted a provider-agnostic runner interface from `ClaudeRunner`, separating CLI-specific logic from shared orchestration concerns. Both Claude and future Codex runners can now be used interchangeably through the `ICliRunner` interface and `createRunner()` factory.

## Changes Made

### New Files
- **`src/core/runner-types.ts`**: Shared types — `RunnerOptions` (renamed from `ClaudeRunnerOptions`), `RunnerConfig` (renamed from `ClaudeRunnerConfig`), `RunResult`
- **`src/core/runner-interface.ts`**: `ICliRunner` interface with `run()`, `runVerbose()`, `runInteractive()`, `runResume()`, `kill()`, `isRunning()`
- **`src/core/completion-detector.ts`**: Extracted `createCompletionDetector()`, `verifyCommit()`, `CompletionDetector` interface, and timing constants from `claude-runner.ts`
- **`src/core/runner-factory.ts`**: `createRunner(config)` factory function and `getProviderBinaryName()` utility; Codex throws "not yet implemented"

### Modified Files
- **`src/core/claude-runner.ts`**: `ClaudeRunner` now implements `ICliRunner`; imports shared types from `runner-types.ts` and completion detection from `completion-detector.ts`; backward-compatible re-exports for `ClaudeRunnerOptions`, `ClaudeRunnerConfig`, `RunResult`, `CommitContext`, `CompletionDetector`, and timing constants
- **`src/core/shutdown-handler.ts`**: Changed from `ClaudeRunner` type to `ICliRunner`; added `registerRunner()` method with `registerClaudeRunner()` as deprecated alias
- **`src/commands/do.ts`**: Uses `createRunner()` instead of `new ClaudeRunner()`
- **`src/commands/plan.ts`**: Uses `createRunner()` instead of `new ClaudeRunner()`
- **`src/commands/config.ts`**: Uses `createRunner()` instead of `new ClaudeRunner()`

## Acceptance Criteria
- [x] `ICliRunner` interface is defined and `ClaudeRunner` implements it
- [x] `createRunner()` factory works for claude provider
- [x] `do.ts` and `plan.ts` use the factory instead of direct `ClaudeRunner` construction
- [x] Completion detection is extracted and shared
- [x] All existing functionality works identically (no behavior changes)
- [x] TypeScript compiles without errors

## Notes
- Backward-compatible re-exports in `claude-runner.ts` ensure existing tests continue to work without modification.
- The pre-existing `name-generator.test.ts` failure (hardcoded `haiku` expectation) remains — unrelated to this task.

<promise>COMPLETE</promise>
