# Project Context

## Goal
update prompts so context.md always gets commited (in both plan and do phases) here is the bug logs then it's not Merging branch "72-terminal-judo" into "main"... ⚠️ Could not clean up worktree: Failed to remove worktree at /Users/eremeev/.raf/worktrees/RAF/72-terminal-judo: Command failed: git worktree remove "/Users/eremeev/.raf/worktrees/RAF/72-terminal-judo" fatal: '/Users/eremeev/.raf/worktrees/RAF/72-terminal-judo' contains modified or untracked files, use --force to delete it

## Key Decisions
- Planning scope is intentionally unchanged: `src/commands/plan.ts` already calls `commitPlanningArtifacts()`, which stages and commits `input.md`, `context.md`, and plan files after planning/amend sessions.
- The fix is runtime enforcement, not a prompt-only change. `src/prompts/execution.ts` already instructs the executor to `git add` `context.md`; the bug is that RAF currently accepts success without proving that happened.
- If a task writes a `COMPLETE` marker but the final task commit omits `context.md`, RAF should fail/retry the task instead of auto-creating a follow-up commit.
- None.

## Current State
- Status: completed
- Total tasks: 1
- Completed: 1
- Pending: 0
- Failed: 0
- Blocked: 0

## Completed Work
- Task 1: enforce-context-commit-verification — Updated RAF's execution-time commit verification so `raf do` only treats a task as successful when the final RAF task commit touched both the task outcome file and the refreshed project `context.md`.

## Pending Work
- No pending work.

## Source Files
- input.md
- plans/
- outcomes/
- outcomes/1-enforce-context-commit-verification.md
