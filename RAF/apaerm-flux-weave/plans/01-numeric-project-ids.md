---
effort: high
---
# Task: Switch Project IDs to Numeric

## Objective
Replace the epoch-based base26 project ID system with sequential numeric IDs (1, 2, 3, ...) that are unique across all worktrees and the main repo.

## Context
Currently project IDs are 6-character base26 strings derived from Unix timestamps (e.g., "apaerm"). This is hard to read and type. Switching to simple incrementing numbers (1-foo, 2-bar, 10-buz) makes projects easier to reference. No migration of existing projects is needed — treat this as a fresh start. No need to maintain backward compatibility with base26 IDs.

## Requirements
- Project folder format: `{number}-{name}` (e.g., `1-my-project`, `12-auth-system`)
- No zero-padding on the number
- Numbers are only digits — no alpha characters in the ID portion
- To find the next ID: scan ALL worktrees + main repo's `RAF/` folder for the highest existing numeric ID, then increment by 1
- If no projects exist, start at 1
- Project ID uniqueness must be maintained even when projects are created in different worktrees
- Gaps in the sequence are fine (e.g., 1, 2, 3, 5 → next is 6, not 4). Always use `max(existing IDs) + 1`, never fill gaps

## Implementation Steps

1. **Replace ID encoding/decoding in `src/utils/paths.ts`:**
   - Remove `encodeBase26()`, `decodeBase26()`, and `RAF_EPOCH` constant
   - Replace `getNextProjectNumber()` to:
     - Scan `RAF/` in the main repo for folders matching `^\d+-`
     - Scan all worktree directories at `~/.raf/worktrees/{repoBasename}/` for folders matching `^\d+-`
     - Extract the numeric prefix from each folder name
     - Return `max + 1` (or `1` if none found)
   - Update `extractProjectNumber()` to extract the numeric prefix (everything before the first `-`)

2. **Update project folder creation in `src/commands/plan.ts`:**
   - Where `getNextProjectNumber()` is called, use the new numeric ID
   - Update folder naming from `{base26Id}-{name}` to `{numericId}-{name}`

3. **Update project resolution in `src/utils/paths.ts`:**
   - `resolveProjectIdentifierWithDetails()` — update matching logic:
     - Full folder name match (exact)
     - Numeric prefix match (e.g., input "5" matches "5-auth-system")
     - Project name match (case-insensitive)
   - Remove base26-specific matching logic

4. **Update worktree project resolution in `src/core/worktree.ts`:**
   - `resolveWorktreeProjectByIdentifier()` — same matching changes as above
   - `computeWorktreePath()` — uses projectId which is now numeric
   - Update any regex patterns that expect 6-char base26 IDs

5. **Update commit message rendering in `src/utils/config.ts`:**
   - `renderCommitMessage()` uses `{projectId}` — ensure it works with numeric IDs (should work as-is since it's just string interpolation)

6. **Update `src/core/git.ts`:**
   - `extractProjectNumber()` or similar functions that parse folder names for the ID portion

7. **Update `src/commands/status.ts`:**
   - Project listing/display — ensure numeric IDs render correctly

8. **Update any regex patterns across the codebase** that assume project IDs are 6-character lowercase alpha strings (e.g., `[a-z]{6}` patterns).

9. **Update tests** in `tests/` that reference base26 encoding/decoding or use base26 project IDs in fixtures.

## Acceptance Criteria
- [ ] New projects get sequential numeric IDs starting from 1
- [ ] `getNextProjectNumber()` scans all worktrees + main to find the highest ID
- [ ] Project folders are named `{number}-{name}` (e.g., `3-auth-system`)
- [ ] `raf plan` creates projects with numeric IDs
- [ ] `raf plan --amend 3` resolves project by numeric ID
- [ ] `raf status` displays projects with numeric IDs correctly
- [ ] Commit messages use numeric IDs: `RAF[3] Plan: auth-system`
- [ ] Worktree paths use numeric IDs
- [ ] All tests pass

## Notes
- The `getNextProjectNumber()` function needs access to the git repo root to scan `RAF/` and to `~/.raf/worktrees/` to scan worktrees. It may need the repo basename as a parameter.
- No backward compatibility with base26 IDs is required — this is a clean break.
- The worktree scan should handle the case where `~/.raf/worktrees/{repoBasename}/` doesn't exist yet.
