# Task 2: Wire --provider CLI Flag Through to Runner and Model Resolution

## Summary
Wired the inert `--provider` CLI flag through to `createRunner()` and `resolveEffortToModel()` in both `do.ts` and `plan.ts`, so that `--provider codex` actually creates a `CodexRunner` and uses the codex effort mapping.

## Changes Made

### File: `src/commands/do.ts`
- Added `provider` field to `SingleProjectOptions` interface
- Pass `options.provider` through `executeSingleProject` to the task execution loop
- Updated `resolveTaskModel()` to accept an optional `provider` parameter and pass it to `resolveEffortToModel()`
- Pass `provider` to `createRunner({ model, provider })` in the task retry loop

### File: `src/commands/plan.ts`
- Read `options.provider` in the action handler
- Pass `provider` through to `runPlanCommand()`, `runAmendCommand()`, and `runResumeCommand()`
- Pass `provider` to all three `createRunner({ model, provider })` call sites
- Pass `provider` through the duplicate-project amend redirect flow

## Verification
- TypeScript compiles without errors (`npm run build`)
- All acceptance criteria met:
  - `raf do --provider codex` will create a `CodexRunner` (provider flows to `createRunner`)
  - `raf plan --provider codex` will create a `CodexRunner` for planning sessions
  - `resolveEffortToModel` receives the provider param for codex effort mapping
  - TypeScript compiles cleanly

<promise>COMPLETE</promise>
