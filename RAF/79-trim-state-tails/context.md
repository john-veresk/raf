# Project Context

## Goal
Tighten RAF's `context.md` prompt contract so planning and execution agents maintain shared project context without a `## Current State` section and so completed execution updates `## Project Files` with the task's outcome path.

## Key Decisions
- Treat this as a prompt-contract change, not a runtime `context.md` generator change. The current code reads `context.md` verbatim and does not synthesize its sections.
- Explicitly forbid a `## Current State` section in `context.md` guidance rather than merely stopping its recommendation.
- Require successful execution guidance to append the current task's outcome file path to `## Project Files`.

## Project Files
- `input.md` — Inspect for the original request and the planning interview clarifications that define this project's scope.
- `context.md` — Inspect for the canonical shared project summary and durable decisions that future planning or execution work must preserve.
- `plans/1-update-context-prompt-contract.md` — Inspect when implementing the prompt, test, and documentation updates for this project.
