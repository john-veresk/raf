# Task: Replace Core ID Generation with Epoch-Based Base36

## Objective
Replace the sequential project numbering system with timestamp-based IDs using base36 encoding of shifted unix time.

## Context
Currently RAF uses sequential numbering (001-999 numeric, then a00-zzz base36). This task replaces that with a new scheme: each project ID is the base36 encoding of `(current_unix_seconds - RAF_EPOCH)`, zero-padded to 6 characters. The RAF epoch is 2026-01-01T00:00:00Z (unix timestamp 1767225600). This is a clean break — no backward compatibility with old IDs.

## Requirements
- Define the RAF epoch constant: 1767225600 (2026-01-01T00:00:00Z)
- ID width: 6 characters, zero-padded (covers ~69 years)
- Encoding: standard base36 (digits 0-9, letters a-z) of the shifted timestamp in seconds
- `getNextProjectNumber()` → replace with a function that generates an ID from `Math.floor(Date.now()/1000) - RAF_EPOCH`
- Collision handling: if a folder with that ID already exists in the RAF dir, increment by 1 until a free slot is found
- Replace `encodeBase36()` / `decodeBase36()` with simple base36 encode/decode operating on any non-negative integer, outputting 6-char zero-padded strings
- Replace `formatProjectNumber()` to use the new encoding
- Remove the old constants `BASE36_START`, `MAX_NUMERIC`, and the old `isBase36Prefix()` check
- The function should still accept a `rafDir` parameter to scan for collisions
- Keep the function signatures compatible where possible or update all callers

## Implementation Steps
1. Replace the old base36 constants and encoding functions in `src/utils/paths.ts` with the new epoch-based system
2. Rewrite `getNextProjectNumber()` to generate timestamp-based IDs with collision avoidance
3. Rewrite `formatProjectNumber()` to produce 6-char zero-padded base36 strings
4. Update `isBase36Prefix()` to validate 6-char base36 strings (the new format)
5. Update callers in `src/core/project-manager.ts` and `src/commands/plan.ts` (both call `getNextProjectNumber()` and `formatProjectNumber()`)

## Acceptance Criteria
- [ ] New epoch constant defined
- [ ] `encodeBase36(n)` converts any non-negative integer to a 6-char zero-padded base36 string
- [ ] `decodeBase36(str)` converts a 6-char base36 string back to an integer
- [ ] ID generation uses `floor(Date.now()/1000) - 1767225600`
- [ ] Collision detection increments ID when folder already exists
- [ ] Old sequential numbering code fully removed
- [ ] All callers updated
- [ ] TypeScript compiles with no errors

## Notes
- The `number` field in `ProjectInfo`, `DiscoveredProject`, etc. will now hold the shifted timestamp value (a large integer like 3456000) rather than a small sequential number. This is fine — it still sorts correctly by creation time.
- Consider whether `getNextProjectNumber` should return a number or a string. Currently returns number, which works since the timestamp fits in JS number range easily.
