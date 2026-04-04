---
effort: low
---
# Task: Add --worktree / --no-worktree Flags to raf plan

## Objective
Add `--worktree` and `--no-worktree` CLI flags to the `raf plan` command (new project creation only) to override the `worktree` config setting.

## Context
The `worktree` config setting (default: `false`) controls whether projects are created in git worktrees. Currently the only way to change this is via `raf config set worktree true`. Adding CLI flags lets users override per-invocation without changing their config. This applies only to `raf plan` for new projects — amend mode keeps its existing worktree promotion logic.

## Dependencies
1 (see outcomes/1-remove-council-feature.md)

## Requirements
- Add mutually exclusive `--worktree` and `--no-worktree` flags to the `plan` command
- Flags override the config `worktree` setting for new project creation only
- If neither flag is passed, behavior is unchanged (uses config value)
- Amend mode (`--amend`) is unaffected by these flags

## Implementation Steps

1. **`src/commands/plan.ts`** — add the flags to the command definition (after line 69):
   ```typescript
   .option('--worktree', 'Create project in a git worktree (overrides config)')
   .option('--no-worktree', 'Create project in main repo (overrides config)')
   ```

   Commander.js natively supports `--no-` prefix flags: `.option('--worktree', ...)` automatically creates both `--worktree` and `--no-worktree`, with `options.worktree` being `true`, `false`, or `undefined`.

2. **Update `PlanCommandOptions` type** (find it near the top of plan.ts or in a types file):
   Add `worktree?: boolean` to the interface.

3. **Resolve the effective worktree setting in `runPlanCommand`** (before line 199):
   ```typescript
   // Resolve worktree mode: CLI flag > config
   const worktreeEnabled = options.worktree !== undefined
     ? options.worktree
     : getWorktreeDefault();
   ```

   Replace the existing `const worktreeEnabled = getWorktreeDefault();` on line 199 with this.

4. **Do NOT pass the flag to amend/resume flows** — leave those paths using `getWorktreeDefault()` directly.

## Acceptance Criteria
- [ ] `raf plan --worktree` creates the project in a worktree even when config `worktree` is `false`
- [ ] `raf plan --no-worktree` creates the project in main repo even when config `worktree` is `true`
- [ ] `raf plan` (no flag) uses the config value as before
- [ ] `raf plan --amend` ignores the `--worktree`/`--no-worktree` flags (uses config)
- [ ] TypeScript compiles without errors

## Notes
- Commander.js boolean flag behavior: `.option('--worktree', ...)` gives you `--worktree` (sets to `true`) and `--no-worktree` (sets to `false`) automatically. When neither is passed, `options.worktree` is `undefined`. No need to define the `--no-worktree` option separately.
