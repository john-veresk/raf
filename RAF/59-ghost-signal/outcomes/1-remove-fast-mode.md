# Outcome: Remove fast mode feature entirely

## Summary

Removed all fast mode code, config fields, validation, CLI arg passing, documentation, and tests from the codebase.

## Key Changes

### Types & Config
- **`src/types/config.ts`**: Removed `fast?: boolean` from `ModelEntry` interface and `MODEL_ENTRY_SCHEMA`
- **`src/utils/config.ts`**: Removed `'fast'` from `VALID_MODEL_ENTRY_KEYS`, removed `fast` validation in `validateModelEntry`, removed `getCodexFastWarning`/`collectModelEntryWarnings`/`collectConfigValidationWarnings` functions, removed fast-stripping logic in `mergeModelEntry`, removed unused `logger` import
- **`src/core/runner-types.ts`**: Removed `fast?: boolean` from `RunnerConfig`
- **`src/core/claude-runner.ts`**: Removed `private fast` field, constructor assignment, and all three `--settings '{"fastMode": true}'` arg-pushing blocks

### Commands & Display
- **`src/commands/do.ts`**: Removed `fast` from runner config construction, `formatResolvedTaskModel`, and `currentModelFast` tracking variable
- **`src/commands/plan.ts`**: Removed `fast` from all three `createRunner()` calls
- **`src/commands/config.ts`**: Removed `collectConfigValidationWarnings` import and usage, removed `fast` from runner config
- **`src/core/worktree.ts`**: Removed `fast` from merge runner config
- **`src/utils/terminal-symbols.ts`**: Removed `fast` from `ModelDisplayOptions` and `formatModelMetadata`

### Documentation
- **`src/prompts/config-docs.md`**: Removed `fast` from model entry shape, bullet docs, and the entire "Fast Mode" section
- **`README.md`**: Updated task line display format description to remove `fast`

### Tests
- **`tests/unit/config.test.ts`**: Removed fast mode warning tests and `collectConfigValidationWarnings` import
- **`tests/unit/config-command.test.ts`**: Removed fast mode warning test
- **`tests/unit/terminal-symbols.test.ts`**: Removed fast-specific tests, updated metadata display tests

## Verification

- TypeScript compiles cleanly (`tsc --noEmit`)
- All config and terminal-symbols tests pass (pre-existing failures about `display` config and `cache tokens` are unrelated)
- No `fast` references remain in src/ or tests/ (except unrelated "fast-forward" in README and "Uses a fast model" comment in failure-analyzer.ts)

<promise>COMPLETE</promise>
