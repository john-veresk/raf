# Task: Replace base36 project ID encoding with base26 (a-z only)

## Objective
Replace the base36 (0-9a-z) project ID encoding with base26 (a-z only) so project IDs contain only letters and sort naturally.

## Context
Project IDs currently use base36 encoding (digits + letters), which confuses natural sort ordering. Switching to pure letters (a-z) eliminates this problem. Task IDs remain base36 unchanged. Prior work on the base36 system is in commit f3a88aeead9549be7ff52ac50a197ddd42128bf0.

## Requirements
- Base26 alphabet: a=0, b=1, c=2, ..., z=25
- ID width: 6 characters, padded with 'a' (the zero-equivalent)
- Examples: 0 → "aaaaaa", 1 → "aaaaab", 25 → "aaaaaz", 26 → "aaaaba"
- Maximum value: 26^6 - 1 = 308,915,775 (~9.8 years from RAF epoch 2026-01-01)
- Task IDs stay base36 (2-char, 0-9a-z) — do NOT modify task ID functions
- RAF_EPOCH constant stays the same (1767225600)

## Implementation Steps
1. In `src/utils/paths.ts`, replace `encodeBase36()` with a base26 encoder (a-z alphabet, 6-char, 'a'-padded). Rename to reflect the new encoding.
2. Replace `decodeBase36()` with the corresponding base26 decoder. Rename accordingly.
3. Update `isBase36Prefix()` to validate `[a-z]{6}` instead of `[0-9a-z]{6}`. Rename.
4. Update `formatProjectNumber()` to call the new encoder.
5. Update all regex patterns across the codebase from `[0-9a-z]{6}` to `[a-z]{6}` — these appear in `paths.ts`, `state-derivation.ts`, `validation.ts`, and `git.ts`.
6. Update all function names and references across importers — search for `encodeBase36`, `decodeBase36`, `isBase36Prefix` in all source files.
7. Update JSDoc comments and inline documentation to say "base26" instead of "base36" for project IDs.

## Acceptance Criteria
- [ ] `encodeBase36` / `decodeBase36` / `isBase36Prefix` replaced with base26 equivalents
- [ ] All project ID regex patterns updated to `[a-z]{6}`
- [ ] `getNextProjectNumber()` generates base26 IDs
- [ ] Task ID functions (`encodeTaskId`, `decodeTaskId`, `TASK_ID_PATTERN`) remain untouched
- [ ] Project builds without errors (`npm run build`)

## Notes
- The encoding is NOT standard `toString(26)`. It uses a custom a-z alphabet (not 0-9a-p).
- `parseInt(str, 26)` won't work for decoding because JS base26 uses 0-9a-p, not a-z. Implement custom encode/decode.
- Only project IDs change. Task IDs, RAF_EPOCH, and the overall folder structure stay the same.
