# Project Context

## Goal
since with context.md introduction we write down user input there as goal, i suggest to remove input since it's redundant. amend command will update this goal seaction. but rename it as "User Prompt" section

## Key Decisions
- `input.md` remains the canonical raw prompt/history file managed by RAF.
- `context.md` keeps the `## Goal` section name.
- `## Goal` is now a clarified summary of the project direction, not a blind copy of raw input.
- The authoritative stored goal lives in editable `context.md`, and RAF must preserve it across context refreshes.
- `raf plan --amend` should resummarize `## Goal` when the user changes direction or materially reframes scope.

## Current State
- Status: ready
- Total tasks: 1
- Completed: 0
- Pending: 1
- Failed: 0
- Blocked: 0

## Completed Work
- No completed work yet.

## Pending Work
- Task 1: preserve-editable-goal-in-context [pending] — Keep `input.md` as RAF-managed raw prompt history while turning `context.md`'s `## Goal` into a maintained clarified summary that planning and amend flows can update without losing it on refresh.

## Source Files
- input.md
- plans/
- outcomes/
