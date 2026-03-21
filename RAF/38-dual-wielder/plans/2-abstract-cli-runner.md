---
effort: high
---
# Task: Abstract CLI Runner Interface

## Objective
Extract a provider-agnostic runner interface from `ClaudeRunner` so both Claude and Codex can be used interchangeably.

## Context
`ClaudeRunner` in `src/core/claude-runner.ts` currently contains both Claude-specific logic (CLI args, path discovery) and generic orchestration logic (timeout management, completion detection, PTY handling). We need to separate these concerns so Codex can plug in with its own CLI-specific logic while reusing the orchestration.

## Dependencies
1

## Requirements
- Create an abstract `CliRunner` interface/base class that both providers implement
- The interface must support: `run()`, `runVerbose()`, `runInteractive()`, `runResume()`, `kill()`, `isRunning()`
- Keep `RunResult` and `ClaudeRunnerOptions` as shared types (rename options to `RunnerOptions`)
- Completion detection logic (grace period, commit verification) should remain shared
- Create a factory function that returns the correct runner based on provider config
- Existing code that uses `ClaudeRunner` should work with minimal changes (ideally just type changes)

## Implementation Steps

1. **Create `src/core/runner-types.ts`**:
   - Move shared types here: `RunnerOptions` (renamed from `ClaudeRunnerOptions`), `RunnerConfig` (renamed from `ClaudeRunnerConfig`), `RunResult`
   - Add `provider: HarnessProvider` to `RunnerConfig`
   - Re-export from `claude-runner.ts` for backward compat

2. **Create `src/core/runner-interface.ts`**:
   - Define the `ICliRunner` interface:
     ```typescript
     export interface ICliRunner {
       runInteractive(systemPrompt: string, userMessage: string, options?: RunnerOptions): Promise<number>;
       runResume(options?: RunnerOptions): Promise<number>;
       run(prompt: string, options?: RunnerOptions): Promise<RunResult>;
       runVerbose(prompt: string, options?: RunnerOptions): Promise<RunResult>;
       kill(): void;
       isRunning(): boolean;
     }
     ```

3. **Refactor `src/core/claude-runner.ts`**:
   - `ClaudeRunner` implements `ICliRunner`
   - Keep all existing Claude-specific logic (arg building, `which claude`, stream-json parsing)
   - Import shared types from `runner-types.ts`
   - The completion detection helpers (`createCompletionDetector`, `verifyCommit`, etc.) stay in this file or move to a shared utils file since Codex will need them too

4. **Create `src/core/runner-factory.ts`**:
   - Export `createRunner(config: RunnerConfig): ICliRunner`
   - For `provider: 'claude'` → return `new ClaudeRunner(config)`
   - For `provider: 'codex'` → throw for now with "Codex runner not yet implemented" (task 3 will implement it)
   - Export `getProviderBinaryName(provider: HarnessProvider): string` utility

5. **Extract completion detection to `src/core/completion-detector.ts`**:
   - Move `createCompletionDetector`, `verifyCommit`, `CompletionDetector` interface, and related constants
   - Both Claude and Codex runners will import from here

6. **Update consumers**:
   - `src/commands/do.ts`: Use `createRunner()` instead of `new ClaudeRunner()`; pass provider from options
   - `src/commands/plan.ts`: Same
   - `src/core/pull-request.ts`: Will need provider-aware runner creation (can stay claude-only for now with a TODO)
   - Update imports as needed

## Acceptance Criteria
- [ ] `ICliRunner` interface is defined and `ClaudeRunner` implements it
- [ ] `createRunner()` factory works for claude provider
- [ ] `do.ts` and `plan.ts` use the factory instead of direct `ClaudeRunner` construction
- [ ] Completion detection is extracted and shared
- [ ] All existing functionality works identically (no behavior changes)
- [ ] TypeScript compiles without errors

## Notes
- This is a refactoring task — no new features, just structural changes to enable task 3.
- The `runResume()` method is Claude-specific (Codex may not support session resume). The Codex implementation can throw "not supported" for this method.
- Keep the refactoring minimal — don't redesign the whole API, just extract the interface.
