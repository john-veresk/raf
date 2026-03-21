# Task: Add Model Override Support

## Objective
Add CLI flags to override the Claude model for `plan` and `do` commands.

## Context
Currently RAF uses whatever model is configured in Claude's settings. Users need the ability to override this per-command to use different models for different purposes (e.g., Sonnet for faster iterations, Opus for complex planning).

## Requirements
- Add `--model <name>` flag to both `plan` and `do` commands
- Accept values: `sonnet`, `haiku`, `opus` (case-insensitive)
- Add `--sonnet` shorthand flag (equivalent to `--model sonnet`)
- Default model is `opus` for both plan and do stages
- Model flag must be passed to Claude CLI via `--model` argument
- Flags should be mutually exclusive (`--model` and `--sonnet` cannot both be specified)

## Implementation Steps

1. **Update types** (`src/types/config.ts`):
   - Add `model?: string` to `DoCommandOptions` interface
   - Add `model?: string` to a new `PlanCommandOptions` interface (or extend existing)

2. **Update `plan.ts` command**:
   - Add `.option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')`
   - Add `.option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')`
   - Validate model name if provided (must be sonnet, haiku, or opus)
   - Check for conflicting flags (--model and --sonnet together)
   - Pass model to `ClaudeRunner`

3. **Update `do.ts` command**:
   - Add `.option('-m, --model <name>', 'Claude model to use (sonnet, haiku, opus)')`
   - Add `.option('--sonnet', 'Use Sonnet model (shorthand for --model sonnet)')`
   - Validate model name if provided
   - Check for conflicting flags
   - Pass model to `ClaudeRunner`

4. **Update `ClaudeRunner`**:
   - Add `model?: string` to `ClaudeRunnerOptions`
   - For `runInteractive()`: add `--model <model>` to args if model is specified
   - For `run()` and `runVerbose()`: add `--model <model>` to spawn args if model is specified
   - Default to 'opus' if no model specified

5. **Add tests**:
   - Test model validation
   - Test conflicting flag detection
   - Test model argument passed correctly to Claude CLI

## Acceptance Criteria
- [ ] `raf plan --model sonnet` uses Sonnet model
- [ ] `raf plan --sonnet` uses Sonnet model
- [ ] `raf do myproject --model haiku` uses Haiku model
- [ ] `raf do myproject --sonnet` uses Sonnet model
- [ ] Invalid model names are rejected with clear error
- [ ] `--model` and `--sonnet` together produce error
- [ ] Default is Opus when no flag provided
- [ ] All tests pass

## Notes
- The Claude CLI accepts `--model <name>` as a flag
- Model names should be normalized to lowercase before validation
- Consider logging the model being used in verbose mode
