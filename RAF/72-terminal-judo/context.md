# Project Context

## Goal
during plannig mode if i resize terminal - layout of claude/codex output is messed up. it's not happen if i run harness natively, without out raf layer. can we fix raf plan terminal resizing layout mess somehow?

## Key Decisions
- Scope is `Planning Only`: fix `raf plan`, `raf plan --amend`, and Claude resume picker behavior, not every PTY-backed RAF UI.
- Validation bar is `Manual + Targeted Tests`: the implementation should ship with focused unit coverage plus manual resize checks.
- The premise is already verified in code: `src/core/claude-runner.ts` and `src/core/codex-runner.ts` pass initial PTY dimensions at spawn time but never forward later `process.stdout` resize events.

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
- Task 1: fix-planning-terminal-resize [pending] — Forward parent terminal resize events into RAF's PTY-backed planning sessions so Claude/Codex planning UIs keep a correct layout after window resizes.

## Source Files
- input.md
- plans/
- outcomes/
