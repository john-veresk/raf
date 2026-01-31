# Task 001 - Model Override Support

## Summary

Added CLI flags to override the Claude model for `plan` and `do` commands.

## Key Changes

### Files Modified/Created

1. **src/types/config.ts**:
   - Added `ClaudeModelName` type: `'sonnet' | 'haiku' | 'opus'`
   - Added `model?: ClaudeModelName` and `sonnet?: boolean` to `PlanCommandOptions`
   - Added `model?: ClaudeModelName` and `sonnet?: boolean` to `DoCommandOptions`

2. **src/utils/validation.ts**:
   - Added `validateModelName()` function with case-insensitive validation
   - Added `resolveModelOption()` function that:
     - Defaults to `opus` when no flag provided
     - Handles `--sonnet` shorthand
     - Validates model name against allowed values
     - Throws error when conflicting flags used

3. **src/commands/plan.ts**:
   - Added `-m, --model <name>` flag
   - Added `--sonnet` shorthand flag
   - Validates and resolves model before running
   - Passes model to `ClaudeRunner`
   - Logs model name in verbose mode

4. **src/commands/do.ts**:
   - Added `-m, --model <name>` flag
   - Added `--sonnet` shorthand flag
   - Validates and resolves model before running
   - Passes model to `ClaudeRunner`
   - Logs model name in verbose mode

5. **src/core/claude-runner.ts**:
   - Added `ClaudeRunnerConfig` interface with `model?: string`
   - Constructor accepts model config (defaults to `opus`)
   - All execution methods (`run`, `runVerbose`, `runInteractive`) pass `--model` flag to Claude CLI

6. **tests/unit/validation.test.ts**:
   - Added tests for `validateModelName()`:
     - Valid model names (sonnet, haiku, opus)
     - Case normalization
     - Invalid model rejection
   - Added tests for `resolveModelOption()`:
     - Default opus behavior
     - Model flag handling
     - Sonnet shorthand
     - Conflicting flag detection
     - Invalid model rejection

7. **tests/unit/claude-runner.test.ts**:
   - Added "model configuration" test suite:
     - Default opus model
     - Model passed to run()
     - Model passed to runVerbose()
     - Correct argument ordering

## Acceptance Criteria Verification

- [x] `raf plan --model sonnet` uses Sonnet model
- [x] `raf plan --sonnet` uses Sonnet model
- [x] `raf do myproject --model haiku` uses Haiku model
- [x] `raf do myproject --sonnet` uses Sonnet model
- [x] Invalid model names are rejected with clear error
- [x] `--model` and `--sonnet` together produce error
- [x] Default is Opus when no flag provided
- [x] All tests pass (534 tests)

## Test Results

All 534 tests pass, including the new model validation and configuration tests.

<promise>COMPLETE</promise>
