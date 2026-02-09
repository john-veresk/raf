# Outcome: Base26 Encoding Migration

## Summary

Replaced base36 (0-9a-z) project ID encoding with base26 (a-z only) encoding across the entire codebase. Project IDs now contain only lowercase letters, making them visually distinct from task IDs (which remain base36) and sorting naturally as strings.

## Key Changes

### Source Files
- **`src/utils/paths.ts`** — Core implementation:
  - Added `BASE26_ALPHABET` constant (`'abcdefghijklmnopqrstuvwxyz'`)
  - Replaced `encodeBase36()` → `encodeBase26()` with custom a-z encoding (a=0, b=1, ..., z=25)
  - Replaced `decodeBase36()` → `decodeBase26()` with matching decoder
  - Replaced `isBase36Prefix()` → `isBase26Prefix()` using `/^[a-z]{6}$/`
  - Updated `formatProjectNumber()` to call `encodeBase26()`
  - Updated all regex patterns from `[0-9a-z]{6}` to `[a-z]{6}`
- **`src/core/state-derivation.ts`** — Updated import and regex for project discovery
- **`src/utils/validation.ts`** — Updated regex for project validation

### Test Files (12 files updated)
- `tests/unit/paths.test.ts` — Rewrote encode/decode/prefix tests with base26 values
- `tests/unit/project-manager.test.ts` — Updated regex and imports
- `tests/unit/status-command.test.ts` — Updated all hardcoded folder names
- `tests/unit/do-command.test.ts` — Updated folder name references
- `tests/unit/plan-command.test.ts` — Updated folder name references
- `tests/unit/state-derivation.test.ts` — Updated folder names
- `tests/unit/project-picker.test.ts` — Updated folder names and display strings
- `tests/unit/post-execution-picker.test.ts` — Updated folder names
- `tests/unit/commit-planning-artifacts.test.ts` — Updated expected commit messages
- `tests/unit/commit-planning-artifacts-worktree.test.ts` — Updated expected commit messages
- `tests/unit/pull-request.test.ts` — Updated folder names with digit-free prefixes

## Verification
- Build: `npm run build` passes cleanly
- Tests: All 913 tests pass across 44 test suites

## Notes
- Task IDs remain base36 (2-char, 0-9a-z) — unchanged
- RAF_EPOCH constant unchanged (1767225600)
- Encoding examples: 0→"aaaaaa", 1→"aaaaab", 25→"aaaaaz", 26→"aaaaba", 1000→"aaabmm"

<promise>COMPLETE</promise>
