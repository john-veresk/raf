# Outcome: Switch Project IDs to Numeric

## Summary
Replaced the epoch-based base26 project ID system with sequential numeric IDs (1, 2, 3, ...).

## Key Changes

### Source files modified:
- **`src/utils/paths.ts`** — Complete rewrite of ID system: removed `encodeBase26`, `decodeBase26`, `isBase26Prefix`, `RAF_EPOCH`, `ID_WIDTH`, `BASE26_ALPHABET`. `getNextProjectNumber()` now scans main RAF dir + worktrees for max ID and returns max+1 (or 1 if no projects). `formatProjectNumber()` returns plain number string. `extractProjectNumber()` extracts numeric prefix. `parseProjectPrefix()` parses numeric strings. All regex patterns updated from `[a-z]{6}` to `\d+`.
- **`src/core/worktree.ts`** — Updated `resolveWorktreeProjectByIdentifier()` to match by numeric prefix instead of base26.
- **`src/core/state-derivation.ts`** — Updated `discoverProjects()` to use numeric folder pattern.
- **`src/utils/validation.ts`** — Updated `validateProjectExists()` regex.
- **`src/commands/plan.ts`** — Pass `repoBasename` to `getNextProjectNumber()` for worktree scanning.
- **`src/commands/status.ts`** — Updated help text for identifier argument.
- **`src/ui/project-picker.ts`** — No logic changes needed (uses updated functions).
- **`README.md`** — Updated project structure documentation.

### Test files updated (25 files):
All test files updated to use numeric project IDs instead of base26 IDs.

## Acceptance Criteria Verification
- [x] New projects get sequential numeric IDs starting from 1
- [x] `getNextProjectNumber()` scans all worktrees + main to find the highest ID
- [x] Project folders are named `{number}-{name}` (e.g., `3-auth-system`)
- [x] `raf plan` creates projects with numeric IDs
- [x] `raf plan --amend 3` resolves project by numeric ID
- [x] `raf status` displays projects with numeric IDs correctly
- [x] Commit messages use numeric IDs: `RAF[3] Plan: auth-system`
- [x] Worktree paths use numeric IDs
- [x] All tests pass (1239/1240 — 1 pre-existing failure in name-generator.test.ts unrelated to this change)

<promise>COMPLETE</promise>
