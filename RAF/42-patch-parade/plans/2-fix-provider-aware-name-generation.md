---
effort: medium
---
# Task: Fix Provider-Aware Name Generation

## Objective
Pass the selected provider through project name generation so RAF spawns the correct CLI binary and model when suggesting project names.

## Context
`generateProjectNames()` currently hardcodes the Claude binary path through helper functions, so `--provider codex` still launches Claude during name generation. The user wants the provider option threaded through `generateProjectNames()`, `callSonnetForMultipleNames()`, and `runClaudePrint()` and the spawn call switched to `getProviderBinaryName(provider)`.

## Dependencies
1

## Requirements
- Pass the active provider from the planning command into `generateProjectNames()`.
- Update `callSonnetForMultipleNames()` and `runClaudePrint()` to accept a provider parameter.
- Use `getProviderBinaryName(provider)` instead of hardcoding `claude` for the spawn call.
- Resolve the name-generation model with provider awareness so Codex uses `codexModels.nameGeneration`.
- Preserve the existing fallback-name behavior when the CLI call fails.
- Add a focused regression test; broad dual-provider test coverage is not required for this task.

## Implementation Steps
1. Update the name-generation helper signatures to accept a provider argument.
2. Thread provider from `src/commands/plan.ts` into `generateProjectNames()` and related helpers.
3. Replace the hardcoded spawn binary with `getProviderBinaryName(provider)` and provider-aware model lookup.
4. Keep fallback sanitization and fallback name generation behavior unchanged.
5. Add a targeted regression test covering the provider-specific spawn/model path.

## Acceptance Criteria
- [ ] `raf plan --provider codex` uses the Codex binary for generated project names.
- [ ] Name generation uses the provider-appropriate configured model.
- [ ] Claude name generation behavior remains unchanged.
- [ ] A focused regression test covers the new provider-aware path.
- [ ] All tests pass

## Notes
Minimal changes are preferred here; rename helpers only if it materially improves clarity.
