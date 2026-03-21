---
effort: low
---
# Task: Clean up worktree flag from plan command

## Objective
Remove the dead `worktree` option from the plan command's interface and action handler.

## Context
The `PlanCommandOptions` interface still declares `worktree?: boolean` and the action handler reads `options.worktree`, but there is no `--worktree` CLI flag exposed on the plan command. This is dead code that should be cleaned up.

## Requirements
- Remove `worktree?: boolean` from `PlanCommandOptions` interface
- Remove `worktreeMode` variable and its usage from the action handler
- Remove the `worktreeMode` parameter from `runPlanCommand()`
- Remove worktree-related logic inside `runPlanCommand()` (lines ~148-151 git validation, lines ~205-243 worktree creation)
- Remove any now-unused worktree imports

## Implementation Steps
1. In `src/commands/plan.ts`:
   - Remove `worktree?: boolean` from `PlanCommandOptions` (line 56)
   - Remove `const worktreeMode = options.worktree ?? getWorktreeDefault();` (line 74)
   - Remove `worktreeMode` argument from `runPlanCommand()` call (line 87)
   - Remove `worktreeMode` parameter from `runPlanCommand()` function signature (line 94)
   - Remove worktree validation block (lines ~148-151)
   - Remove worktree creation and path handling logic (lines ~205-243)
   - Remove unused imports (`getWorktreeDefault`, worktree-related imports from `../core/worktree.js`)
2. Verify the plan command still works for normal (non-worktree) flow

## Acceptance Criteria
- [ ] No `worktree` references remain in plan.ts (except possibly in unrelated comments)
- [ ] TypeScript compiles without errors
- [ ] No unused imports remain
