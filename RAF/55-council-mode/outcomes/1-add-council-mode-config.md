# Outcome: Add councilMode Config

## Summary

Added `councilMode` boolean config key to RAF's configuration system following the same pattern as `pushOnComplete`/`syncMainBranch`.

## Key Changes

- **`src/types/config.ts`**: Added `councilMode: boolean` to `RafConfig` interface and `councilMode: false` to `DEFAULT_CONFIG`
- **`src/utils/config.ts`**:
  - Added `councilMode` (and `rateLimitWaitDefault` which was also missing) to `VALID_TOP_LEVEL_KEYS`
  - Added boolean validation in `validateConfig()`
  - Added merge logic in `deepMerge()`
  - Added `getCouncilMode()` getter
- **`src/prompts/config-docs.md`**: Added documentation for `councilMode` before the `commitFormat` section

## Notes

- `rateLimitWaitDefault` was also added to `VALID_TOP_LEVEL_KEYS` since it existed in `DEFAULT_CONFIG` but was missing from the valid keys set (would have caused validation errors on `raf config set rateLimitWaitDefault <value>`)
- `getCouncilMode()` will be consumed by task 2 (prompt injection)

<promise>COMPLETE</promise>
