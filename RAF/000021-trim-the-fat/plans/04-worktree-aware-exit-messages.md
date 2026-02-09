# Task: Make Planning and Amend Exit Messages Worktree-Aware

## Objective
When planning or amending in worktree mode, the exit message shown to the user should include `--worktree` in the `raf do` command.

## Context
Currently the planning prompt (`src/prompts/planning.ts`) shows `raf do <project>` as the exit message, and the amend prompt (`src/prompts/amend.ts`) shows a generic "Press Ctrl-C twice to exit" with no `raf do` hint. Neither is aware of worktree mode. When the user planned with `--worktree`, the follow-up `raf do` command also needs `--worktree`, so the exit message should reflect that.

## Dependencies
002

## Requirements
- Add a `worktreeMode` (boolean) parameter to both `PlanningPromptParams` and `AmendPromptParams` interfaces
- When `worktreeMode` is true, the exit message in the planning prompt should show `raf do <project> --worktree` instead of `raf do <project>`
- When `worktreeMode` is true, the exit message in the amend prompt should also include `raf do <project> --worktree`
- Pass the `worktreeMode` value through from `runPlanCommand()` and `runAmendCommand()` in `src/commands/plan.ts` when calling `getPlanningPrompt()` and `getAmendPrompt()`
- Update any existing tests for planning and amend prompts to cover the worktree variation

## Implementation Steps
1. Add `worktreeMode?: boolean` to `PlanningPromptParams` in `src/prompts/planning.ts`
2. Update the exit message template in `getPlanningPrompt()` to conditionally include `--worktree`
3. Add `worktreeMode?: boolean` to `AmendPromptParams` in `src/prompts/amend.ts`
4. Update the exit message in `getAmendPrompt()` to include `raf do <project> --worktree` when in worktree mode
5. Pass `worktreeMode` from `runPlanCommand()` and `runAmendCommand()` in `src/commands/plan.ts` to the prompt functions
6. Update tests for both prompts to verify the worktree-aware exit messages

## Acceptance Criteria
- [ ] Planning in worktree mode shows `raf do <project> --worktree` in exit message
- [ ] Planning in normal mode still shows `raf do <project>` in exit message
- [ ] Amend in worktree mode shows `raf do <project> --worktree` in exit message
- [ ] Amend in normal mode shows exit message without `--worktree`
- [ ] Tests cover both worktree and non-worktree variations
- [ ] All existing tests pass

## Notes
- The planning prompt's exit message is at approximately line 154 of `src/prompts/planning.ts`
- The amend prompt's exit message is at approximately line 184 of `src/prompts/amend.ts` — it currently says "Press Ctrl-C twice to exit" without mentioning `raf do` at all; add the `raf do` command there too
- The `plan.ts` command already has `worktreeMode` as a local variable in both `runPlanCommand()` and `runAmendCommand()`, so it's trivial to pass through
