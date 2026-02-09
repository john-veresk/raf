# Outcome: Replace Core ID Generation with Epoch-Based Base36

## Summary

Replaced the sequential project numbering system (001-999 numeric, then a00-zzz base36) with epoch-based timestamp IDs. Each project ID is now the base36 encoding of `(current_unix_seconds - 1767225600)`, zero-padded to 6 characters.

## Key Changes

### `src/utils/paths.ts`
- Added `RAF_EPOCH` constant (1767225600 = 2026-01-01T00:00:00Z)
- Rewrote `encodeBase36()`: now accepts any non-negative integer, produces 6-char zero-padded base36 string using native `Number.toString(36)`
- Rewrote `decodeBase36()`: validates 6-char format, uses `parseInt(str, 36)`
- Rewrote `isBase36Prefix()`: validates 6-char `[0-9a-z]` format
- Rewrote `getNextProjectNumber()`: generates timestamp-based ID with collision avoidance (increment until free slot found)
- Simplified `formatProjectNumber()`: delegates to `encodeBase36()`
- Updated all regex patterns from `\d{2,3}` / `[a-z][0-9a-z]{2}` to `[0-9a-z]{6}` in: `getProjectDir`, `extractProjectNumber`, `extractProjectName`, `listProjects`, `parseProjectFolder`, `resolveProjectIdentifierWithDetails`
- Simplified `parseProjectPrefix()`: only accepts 6-char base36
- Fixed `resolveProjectIdentifierWithDetails()` to fall through from number matching to name matching when a 6-char identifier doesn't match any project by number (prevents e.g. "second" being mistaken for a base36 prefix)
- Removed old constants: `BASE36_START`, `MAX_NUMERIC`

### `src/core/state-derivation.ts`
- Updated `discoverProjects()` to use new 6-char base36 prefix pattern
- Added `decodeBase36` import

### `tests/unit/paths.test.ts`
- Completely rewritten to test the new epoch-based ID system
- 66 tests, all passing

## Notes
- This is a clean break from old IDs - no backward compatibility
- Other test files in the project still use old-format directories (e.g., `001-first`) for their own test scenarios. These will need updating in a subsequent task that updates the remaining callers/patterns.
- The `number` field in `ProjectInfo`, `DiscoveredProject`, etc. now holds the shifted timestamp value (a large integer) rather than a small sequential number. This still sorts correctly by creation time.

<promise>COMPLETE</promise>
