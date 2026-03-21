# Outcome: Fix Config Validation for Model Objects

## Summary

The config validation in `src/utils/config.ts` was already correctly updated to validate ModelEntry objects (the `validateModelEntry` function properly rejects strings and requires `{ model, provider }` objects). The prior `config improvements` commit had already implemented the correct validation logic.

The one remaining issue was in `src/prompts/config-docs.md`: the LLM session instructions example showed setting a model to a string `"sonnet"` rather than the correct ModelEntry format `{ "model": "sonnet", "provider": "claude" }`. This would cause the config-session LLM to write invalid configs that would then fail validation.

## Changes Made

- **`src/prompts/config-docs.md`**: Updated the "Explaining Changes" example in the LLM session instructions from `"sonnet"` (string) to `{ "model": "sonnet", "provider": "claude" }` (ModelEntry object).

## Acceptance Criteria Status

- [x] No validation warnings when config uses ModelEntry objects with valid model names — validation correctly accepts `{ model, provider }` objects
- [x] Validation correctly rejects malformed ModelEntry objects — errors for missing `model`, missing `provider`, invalid `provider`
- [x] Error messages reference ModelEntry object format — says "must be a model entry object (e.g. { \"model\": \"opus\", \"provider\": \"claude\" })"
- [x] Legacy string-based model values are rejected with a helpful migration message — same error message above
- [x] All existing tests pass — 141 tests pass

<promise>COMPLETE</promise>
