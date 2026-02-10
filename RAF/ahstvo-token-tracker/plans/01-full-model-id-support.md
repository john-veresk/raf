# Task: Support Full Model IDs in Config

## Objective
Allow users to specify full model IDs (e.g., `claude-opus-4-5-20251101`) in addition to short aliases (`opus`, `sonnet`, `haiku`) in the RAF config system.

## Context
Currently, `ClaudeModelName` type only accepts `'sonnet' | 'haiku' | 'opus'`. The Claude CLI `--model` flag already accepts both short aliases and full model IDs, but RAF's config validation rejects full IDs. Users need this to pin specific model versions.

## Requirements
- Keep short names (`sonnet`, `haiku`, `opus`) working as before — they remain the default
- Accept full model IDs matching the pattern `claude-{family}-{version}` (e.g., `claude-opus-4-5-20251101`, `claude-sonnet-4-5-20250929`)
- Validate full model IDs with a regex pattern (not just accept any string)
- Default config values stay as short names
- Update all types, validation, config docs, and tests

## Implementation Steps
1. Widen `ClaudeModelName` type to be a union of the short aliases and a branded/validated string type for full IDs
2. Add a regex pattern constant for validating full model IDs (e.g., `/^claude-[a-z]+-[\d]+-[\d]+(-\d+)?$/` or similar — examine real model ID formats to get the pattern right)
3. Update `VALID_MODELS` and the validation logic in `src/utils/config.ts` to accept both short names and full IDs matching the regex
4. Update `PlanCommandOptions` and `DoCommandOptions` model types to accept full IDs
5. Update the config documentation in `src/prompts/config-docs.md` to mention full model ID support
6. Add tests for validation: valid short names, valid full IDs, invalid strings

## Acceptance Criteria
- [ ] Short model names (`sonnet`, `haiku`, `opus`) continue to work in config
- [ ] Full model IDs like `claude-opus-4-5-20251101` are accepted in config
- [ ] Invalid model strings (e.g., `gpt-4`, `random-string`) are rejected with a clear error
- [ ] Config docs updated to reflect new capabilities
- [ ] All existing tests pass
- [ ] New tests cover full model ID validation

## Notes
- The Claude CLI `--model` flag example from docs: `claude --model claude-sonnet-4-5-20250929`
- Keep the type system helpful — IDE autocomplete should still suggest short names
- The regex should be permissive enough to handle future model naming patterns but strict enough to catch obvious typos
