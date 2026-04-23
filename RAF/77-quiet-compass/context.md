# Project Context

## Goal
End `raf plan` and `raf plan --amend` with a single handoff message by removing the
CLI wrapper's duplicate completion output and relying on the planning agent's final
message.

## Current State
- `src/commands/plan.ts` prints completion summaries and `raf do ...` guidance after
  the interactive planning and amend sessions return.
- `src/prompts/planning.ts` and `src/prompts/amend.ts` already instruct the planning
  agent to print the final exit/invocation guidance.
- `raf plan --resume` has its own completion summary path, but it is out of scope for
  this request.

## Key Decisions
- Remove CLI-side completion output only.
- Apply the change to new planning sessions and amendment sessions.
- Keep the planner prompt's final handoff contract intact.

## Relevant Files
- `src/commands/plan.ts`
- `tests/unit/plan-command-auto-flag.test.ts`
- `README.md`
