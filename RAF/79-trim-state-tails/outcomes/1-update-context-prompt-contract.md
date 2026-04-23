## Summary
Updated RAF's prompt contract so planning and amend guidance explicitly forbids a `## Current State` section in `context.md`, and execution guidance now requires adding the current task's outcome path to `## Project Files` when shared project context is updated.

## Key Changes
- Updated [src/prompts/shared.ts](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/src/prompts/shared.ts) to remove "current state" from durable `context.md` guidance and explicitly forbid a `## Current State` section while preserving the existing `## Goal`, `## Key Decisions`, and `## Project Files` contract.
- Updated [src/prompts/execution.ts](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/src/prompts/execution.ts) so successful executions that update shared context are told to add the current outcome path to `## Project Files` with inspection guidance.
- Updated prompt unit tests in [tests/unit/planning-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/tests/unit/planning-prompt.test.ts), [tests/unit/amend-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/tests/unit/amend-prompt.test.ts), and [tests/unit/execution-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/tests/unit/execution-prompt.test.ts) to cover the stricter `context.md` rules.
- Updated [README.md](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/README.md) so documentation matches the revised `context.md` contract.
- Updated [context.md](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/RAF/79-trim-state-tails/context.md) and checked off the verified acceptance criteria in [plans/1-update-context-prompt-contract.md](/Users/eremeev/.raf/worktrees/RAF/79-trim-state-tails/RAF/79-trim-state-tails/plans/1-update-context-prompt-contract.md).

## Decision Updates
None.

## Notes
- Verified with `npm test -- --runInBand tests/unit/planning-prompt.test.ts`, `npm test -- --runInBand tests/unit/amend-prompt.test.ts`, and `npm test -- --runInBand tests/unit/execution-prompt.test.ts`.
- `npm ci` was required in this worktree because `node_modules` was missing and `jest` was not initially available.

<promise>COMPLETE</promise>
