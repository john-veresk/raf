# Outcome: Update Tests for Base26 Project ID Encoding

## Summary

Updated all remaining test files to use base26 (a-z only) project ID prefixes and nomenclature, completing the migration started in task 01. Added edge case tests for max value encoding/decoding.

## Key Changes

### Test Files Updated (11 files)

- **`tests/unit/execution-prompt.test.ts`** — Replaced digit-containing project numbers (`005`, `001`, `a0b`) with valid base26 prefixes (`aaabmm`, `aaaaab`, `abcdef`). Updated all project paths accordingly. Renamed test "base36 prefix" → "base26 prefix" and "base36 project" → "base26 project".
- **`tests/unit/plan-command.test.ts`** — Renamed describe block "Base36 Project Resolution for Amend" → "Base26 Project Resolution for Amend".
- **`tests/unit/worktree.test.ts`** — Replaced `020-worktree-weaver` → `abaaba-worktree-weaver`, `021-another-feature` → `ababab-another-feature`, `022-prune-cycle` → `abcabc-prune-cycle`, `001-feature` → `aaaaab-feature`. Renamed test "base36 project IDs" → "base26 project IDs".
- **`tests/unit/plan-amend-worktree-recreate.test.ts`** — Replaced `022-my-project` → `abcabc-my-project` throughout.
- **`tests/unit/do-worktree-cleanup.test.ts`** — Replaced `022-prune-cycle` → `abcabc-prune-cycle` throughout.
- **`tests/unit/do-rerun.test.ts`** — Replaced `001-test-project` → `aaaaab-test-project`.
- **`tests/unit/dependency-integration.test.ts`** — Replaced `001-test-project` → `aaaaab-test-project`.
- **`tests/unit/do-blocked-tasks.test.ts`** — Replaced `001-test-project` → `aaaaab-test-project`.
- **`tests/unit/state-derivation.test.ts`** — Replaced `001-test-project` → `aaaaab-test-project` (kept `001-too-short` as it tests invalid format rejection).
- **`tests/unit/worktree-integration.test.ts`** — Replaced `020-test-project` → `abaaba-test-project`.
- **`tests/unit/git-stash.test.ts`** — Replaced `raf-001-task-3-failed` → `raf-aaaaab-task-3-failed` and `raf-002-task-5-failed` → `raf-aaaaac-task-5-failed`.

### New Edge Case Tests Added (in `paths.test.ts`)

- `encodeBase26(26^6 - 1)` → `'zzzzzz'` (max 6-char value)
- `encodeBase26(26^5)` → `'baaaaa'` (boundary value)
- `decodeBase26('zzzzzz')` → `26^6 - 1` (max value decode)
- Roundtrip test now includes max value `26^6 - 1`

## Verification

- Build: `npm run build` passes cleanly
- Tests: All 916 tests pass across 44 test suites (3 new edge case tests added)
- No skipped or commented-out tests
- No remaining digit-containing project ID prefixes in test fixtures (except intentional rejection tests)
- All remaining "base36" references in tests are about task IDs (which correctly remain base36)

<promise>COMPLETE</promise>
