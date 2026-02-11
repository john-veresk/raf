---
effort: medium
---
# Task: Add --no-worktree flag to plan and do commands

## Objective
Add `--no-worktree` flag so users can override `config.worktree = true` on a per-invocation basis.

## Context
When `worktree: true` is set in config, there's currently no way to run a single command without worktree mode. Commander.js natively supports `--no-*` flags which set the option to `false` explicitly, making the existing `options.worktree ?? getWorktreeDefault()` pattern work correctly.

## Dependencies
None

## Requirements
- Add `--no-worktree` option to both `plan` and `do` commands
- When `--no-worktree` is passed, `options.worktree` must be `false` (not `undefined`)
- The existing resolution `options.worktree ?? getWorktreeDefault()` must work correctly with both `--worktree` and `--no-worktree`
- Update README Command Reference to document the new flag
- Update `raf plan` and `raf do` usage examples where appropriate

## Implementation Steps

1. **Understand Commander.js `--no-*` behavior**: Commander automatically supports `--no-<flag>` for boolean options. When `.option('-w, --worktree', ...)` is defined, Commander already recognizes `--no-worktree`. However, the current definition may need adjustment — verify whether the existing `.option('-w, --worktree', ...)` definition already supports `--no-worktree` out of the box, or if we need `.option('-w, --worktree', ..., undefined)` to make it tri-state (true/false/undefined).

2. **Test Commander behavior**: Write a quick test or check Commander docs. The key question: does `--no-worktree` set `options.worktree = false` with the current option definition? If Commander already supports it, we may only need documentation changes and tests.

3. **Update `src/commands/plan.ts`**:
   - Ensure the `-w, --worktree` option definition supports tri-state (true via `--worktree`, false via `--no-worktree`, undefined when neither is passed)
   - The resolution logic `options.worktree ?? getWorktreeDefault()` already handles this correctly if Commander sets `false` for `--no-worktree`

4. **Update `src/commands/do.ts`**:
   - Same changes as plan.ts

5. **Update README.md**:
   - Add `--no-worktree` to the Command Reference tables for both `plan` and `do`
   - Add a brief note in the Worktree Mode section about overriding the config default

6. **Add tests**:
   - Test that `--no-worktree` correctly overrides `config.worktree = true`
   - Test that `--worktree` still works as before
   - Test that omitting both flags falls back to config default

## Acceptance Criteria
- [ ] `raf plan --no-worktree` runs without worktree mode even when `config.worktree = true`
- [ ] `raf do --no-worktree` runs without worktree mode even when `config.worktree = true`
- [ ] `--worktree` still works as before
- [ ] Omitting both flags falls back to config default
- [ ] README documents the new flag
- [ ] Tests cover the tri-state behavior
- [ ] `npm test` passes
