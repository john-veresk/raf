# Task 001 - Add Model Override Support

## Summary

Added CLI flags to override the Claude model for `plan` and `do` commands. Users can now specify which model to use per-command using `--model <name>` or the `--sonnet` shorthand.

## Implementation Details

### Types (`src/types/config.ts`)
- Added `ClaudeModelName` type: `'sonnet' | 'haiku' | 'opus'`
- Added `model?: ClaudeModelName` to `PlanCommandOptions`
- Added `model?: ClaudeModelName` and `sonnet?: boolean` to `DoCommandOptions`

### Validation (`src/utils/validation.ts`)
- Added `VALID_MODELS` constant: `['sonnet', 'haiku', 'opus']`
- Added `validateModelName(model: string)`: Normalizes to lowercase and validates
- Added `resolveModelOption(model?, sonnet?)`: Resolves model from flags with conflict detection, defaults to 'opus'

### Plan Command (`src/commands/plan.ts`)
- Added `.option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')`
- Added `.option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')`
- Validates model with `resolveModelOption()` before execution
- Passes model to `ClaudeRunner`
- Logs model being used in verbose mode

### Do Command (`src/commands/do.ts`)
- Added `.option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')`
- Added `.option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')`
- Validates model with `resolveModelOption()` before execution
- Passes model to `ClaudeRunner`
- Logs model being used in verbose mode

### ClaudeRunner (`src/core/claude-runner.ts`)
- Added `model?: string` to `ClaudeRunnerConfig`
- Constructor stores model, defaults to `'opus'`
- All methods (`runInteractive`, `run`, `runVerbose`) pass `--model <model>` to Claude CLI
- Debug logging includes model name

### Tests
- `tests/unit/validation.test.ts`:
  - Tests for `validateModelName()` (valid names, case normalization, invalid rejection)
  - Tests for `resolveModelOption()` (default opus, --model flag, --sonnet shorthand, conflict detection, invalid name rejection)
- `tests/unit/claude-runner.test.ts`:
  - Tests for model configuration (default opus, model passed in run(), model passed in runVerbose(), correct flag order)

## Acceptance Criteria Status

- [x] `raf plan --model sonnet` uses Sonnet model
- [x] `raf plan --sonnet` uses Sonnet model
- [x] `raf do myproject --model haiku` uses Haiku model
- [x] `raf do myproject --sonnet` uses Sonnet model
- [x] Invalid model names are rejected with clear error
- [x] `--model` and `--sonnet` together produce error
- [x] Default is Opus when no flag provided
- [x] All tests pass (544 tests)

## Usage Examples

```bash
# Use Sonnet for planning (faster iterations)
raf plan --model sonnet

# Use Sonnet shorthand
raf plan --sonnet

# Use Haiku for execution
raf do myproject --model haiku

# Use Opus explicitly (same as default)
raf do myproject --model opus
```

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 2m 12s
- Completed at: 2026-01-31T12:03:32.915Z
