---
effort: low
---
# Task: Fix Config Validation for Model Objects

## Objective
Fix the config validation error that incorrectly requires model values to be short aliases or full model IDs, when model objects (ModelEntry) are now the only supported format.

## Context
After migrating to ModelEntry objects (model + provider + optional fields), the validation in `src/utils/config.ts` still checks for string-based model values. Running `raf config` produces: "Config validation warning: models.plan must be a short alias (sonnet, haiku, opus) or a full model ID". This is the foundation fix needed before other config changes.

## Requirements
- Remove all legacy string-based model validation from `src/utils/config.ts`
- Only accept ModelEntry objects (with `model`, `provider`, and optional fields)
- Validate that each ModelEntry has required `model` (string) and `provider` ("claude" | "codex") fields
- Validate optional fields like `reasoningEffort` when present
- Update error messages to reference the ModelEntry object format
- Update config-docs.md examples if they still show string-based model values

## Implementation Steps
1. Read `src/utils/config.ts` and locate the model validation logic (around lines 92-116 and the `validateConfig` function)
2. Replace string-based model name validation with ModelEntry object shape validation
3. Ensure `model` field within ModelEntry is still validated as a valid model name/alias
4. Ensure `provider` field is validated as "claude" or "codex"
5. Update any error messages to show correct expected format
6. Test by reviewing what `raf config` would produce with a valid ModelEntry config

## Acceptance Criteria
- [ ] No validation warnings when config uses ModelEntry objects with valid model names
- [ ] Validation correctly rejects malformed ModelEntry objects (missing model, missing provider, invalid provider)
- [ ] Error messages reference ModelEntry object format, not string aliases
- [ ] Legacy string-based model values are rejected with a helpful migration message
- [ ] All existing tests pass (if any)

## Notes
- The ModelEntry interface is defined in `src/types/config.ts` (lines 33-40)
- Valid model aliases: sonnet, haiku, opus (Claude); spark, codex, gpt54 (Codex)
- Valid full IDs: claude-{family}-{version} pattern, gpt-{major}.{minor} pattern
