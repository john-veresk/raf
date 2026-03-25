---
effort: medium
---
# Task: Support nested dot-path keys in `raf config set`

## Objective
Make `raf config set models.execute.reasoningEffort high` work by resolving arbitrary-depth dot-paths against DEFAULT_CONFIG schema.

## Context
Currently `handleSet()` in `src/commands/config.ts` only validates top-level keys and full object paths (e.g., `models.execute` as a whole ModelEntry). It uses `getNestedValue(DEFAULT_CONFIG, key)` to check if the key exists in the schema, but this fails for leaf properties inside objects like `ModelEntry` because `models.execute.reasoningEffort` is a valid leaf in DEFAULT_CONFIG but the validation rejects it as "not found in schema".

The fix must also handle the merge case: when setting `models.execute.reasoningEffort`, the user's config file may not yet have a `models.execute` entry. The code should merge the sub-field change on top of the default value.

## Requirements
- `raf config set models.execute.reasoningEffort high` must work
- `raf config set models.plan.fast true` must work
- `raf config set effortMapping.low.model sonnet` must work
- `raf config set codex.executionMode fullAuto` must work (if codex is a nested object)
- Setting a sub-field that doesn't exist in DEFAULT_CONFIG must still error (e.g., `models.execute.foo bar`)
- When setting a sub-field, missing intermediate objects must be populated from DEFAULT_CONFIG defaults before applying the change
- When the resulting value matches the default, it should still be removed from user config (existing behavior)
- Validation via `validateConfig()` must still pass after the set operation

## Implementation Steps
1. Read `src/commands/config.ts` — focus on `handleSet()` (around line 264-326) and the `getNestedValue` / `setNestedValue` helpers
2. Read `src/types/config.ts` — understand `DEFAULT_CONFIG` structure and all nested objects
3. Modify the key validation in `handleSet()`:
   - Currently checks `getNestedValue(DEFAULT_CONFIG, key) === undefined` and errors
   - Change to: if the direct path resolves in DEFAULT_CONFIG, it's valid (existing behavior). If not, check if it's a valid **leaf** within a known nested object by verifying the parent path resolves to an object and the leaf key exists in that object.
4. Modify the value-setting logic:
   - When setting a leaf inside a nested object (e.g., `models.execute.reasoningEffort`):
     - Get the current user config value for the parent path (e.g., `models.execute`)
     - If it doesn't exist in user config, start from the DEFAULT_CONFIG value for that parent path
     - Apply the sub-field change to that object
     - Use `setNestedValue` to write the full parent object back
5. Ensure the "remove if matches default" logic works for sub-fields:
   - After applying the change, compare the full parent object against DEFAULT_CONFIG
   - If they match, remove the parent from user config
6. Test manually: `raf config set models.execute.reasoningEffort high`, then `raf config get models.execute` to verify
7. Test edge cases: invalid sub-field name, setting back to default value (should remove), setting on a path that's a primitive not an object

## Acceptance Criteria
- [ ] `raf config set models.execute.reasoningEffort high` succeeds and persists the value
- [ ] `raf config get models.execute.reasoningEffort` returns `high`
- [ ] `raf config set models.execute.nonExistent foo` errors with "Config key not found"
- [ ] Setting a sub-field to its default value removes it from user config
- [ ] `validateConfig()` passes after any valid sub-field set operation
- [ ] Existing top-level and full-path set operations still work unchanged

## Notes
- The `getNestedValue` helper already handles dot-path traversal, so the main change is in the validation logic and the merge-with-defaults behavior
- Be careful with the deep equality check for "remove if matches default" — it must compare the full parent object, not just the sub-field
- The `parseValue` helper already handles JSON parsing (numbers, booleans, strings), so `high` will be parsed as a string and `true` as a boolean — this is correct
