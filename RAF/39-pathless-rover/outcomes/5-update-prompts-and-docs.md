# Task 5: Update Prompts, Docs, and Config Docs for Removed --worktree Flag

## Summary
Updated README.md to remove stale `--worktree` references for `raf do`. The `raf plan` command still supports `--worktree` for new project creation, so those references were preserved.

## Changes Made

### File: `README.md`
- Removed `raf do --worktree` and `raf do my-feature -w` examples from the `raf do` usage block
- Updated "Basic workflow" in Worktree Mode section: `raf do my-feature --worktree` → `raf do my-feature` with note "(auto-detected, no flag needed)"
- Added bullet in "How it works" section: `raf do` auto-detects whether a project lives in a worktree — no `--worktree` flag needed
- Clarified `--no-worktree` bullet to specify it applies to `raf plan` (not `raf do`)
- Removed `-w, --worktree` and `--no-worktree` rows from `raf do` command reference table

## No Changes Needed
- `src/prompts/planning.ts` — already cleaned up in Task 3
- `src/prompts/amend.ts` — already cleaned up in Task 3
- `src/prompts/config-docs.md` — already accurate (references are specific to `raf plan --worktree`, which still has the flag)
- `src/commands/do.ts` — already cleaned up in Task 3

## Verification
- TypeScript compiles without errors (`npm run build`)
- All remaining `--worktree` references are scoped to `raf plan` (still valid)
- No stale `--worktree` references for `raf do` or `raf plan --amend`

<promise>COMPLETE</promise>
