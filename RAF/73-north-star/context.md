# Project Context

## Goal
since with context.md introduction we write down user input there as goal, i suggest to remove input since it's redundant. amend command will update this goal seaction. but rename it as "User Prompt" section

## Key Decisions
- `input.md` remains the canonical raw prompt/history file managed by RAF.
- `context.md` keeps the `## Goal` section name.
- `## Goal` is now a clarified summary of the project direction, not a blind copy of raw input.
- The authoritative stored goal lives in editable `context.md`, and RAF must preserve it across context refreshes.
- `raf plan --amend` should resummarize `## Goal` when the user changes direction or materially reframes scope.
- None.

## Current State
- Status: completed
- Total tasks: 1
- Completed: 1
- Pending: 0
- Failed: 0
- Blocked: 0

## Completed Work
- Task 1: preserve-editable-goal-in-context — Preserved editable `## Goal` content in `context.md` across refreshes, while keeping `input.md` as the raw prompt/history source used only for initial goal bootstrapping when no stored goal exists.

## Pending Work
- No pending work.

## Source Files
- input.md
- plans/
- outcomes/
- outcomes/1-preserve-editable-goal-in-context.md
