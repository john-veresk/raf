# Outcome: Support nested dot-path keys in `raf config set`

## Summary

Added support for setting individual sub-fields within nested config objects using dot-path notation (e.g., `raf config set models.execute.reasoningEffort high`).

## Key Changes

- **`src/types/config.ts`**: Added `CONFIG_SCHEMA` — a full schema object that includes all valid keys (including optional `ModelEntry` fields like `reasoningEffort` and `fast`) for key validation purposes.
- **`src/commands/config.ts`**:
  - Added `findNestedParent()` helper that detects when a dot-path key targets a leaf within a nested object and returns the parent path + leaf key.
  - Rewrote `handleSet()` to use merge logic for sub-fields: reads the current parent from user config (falling back to defaults), applies the change, and writes the full parent object back — preserving required sibling fields like `model` and `harness`.
  - Imported `CONFIG_SCHEMA` for validation that includes optional fields.

## Verified Acceptance Criteria

- `raf config set models.execute.reasoningEffort high` succeeds and persists
- `raf config get models.execute.reasoningEffort` returns `high`
- `raf config set models.execute.nonExistent foo` errors with "Config key not found in schema"
- Setting a sub-field back to default removes the parent from user config
- `validateConfig()` passes after all sub-field set operations
- Top-level and full-path set operations still work unchanged

<promise>COMPLETE</promise>
