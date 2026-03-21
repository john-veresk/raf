---
effort: low
---
# Task: Update Prompts, Docs, and Config Docs for Removed --worktree Flag

## Objective
Update all user-facing text (prompts, help text, docs, config documentation) to reflect that `--worktree` is no longer needed for `raf do` and `raf plan --amend`.

## Dependencies
3, 4

## Requirements
- Update planning prompt output that suggests `raf do <project> --worktree` → just `raf do <project>`
- Update amend prompt output if it references `--worktree`
- Update config-docs.md if it documents the `--worktree` flag behavior for `do` or `amend`
- Update README.md CLI usage sections
- Remove any references to `--worktree` in error messages that were in `do.ts`

## Implementation Steps
1. Read `src/prompts/planning.ts` — update the exit message that suggests `--worktree`
2. Read `src/prompts/amend.ts` — update if it references `--worktree`
3. Read `src/prompts/config-docs.md` — update worktree config documentation
4. Read `README.md` — update CLI usage for `raf do` and `raf plan`
5. Grep for any remaining `--worktree` references across the codebase and update as needed

## Acceptance Criteria
- [ ] No prompts suggest `--worktree` for `raf do`
- [ ] No prompts suggest `--worktree` for `raf plan --amend`
- [ ] README accurately reflects current CLI flags
- [ ] Config docs accurately describe worktree behavior
- [ ] No stale `--worktree` references in codebase (except for `raf plan` new project creation where it's still valid)
