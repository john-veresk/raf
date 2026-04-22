# Project Context

## Goal
Remove the public `context` config section, make generated `context.md` effectively unbounded to users, preserve internal safety guards against model context overflow, and silently ignore legacy `context` blocks in existing RAF configs.

## Key Decisions
- Treat `context` as removed legacy config, not as a hidden supported feature.
- Compatibility applies to reading old config files, not to writing new `context` settings through `raf config`.
- Legacy-key stripping should be centralized so `resolveConfig()`, config validation after `raf config wizard`, and preset load paths all behave the same way.
- Internal bounds should live with the project-context generator, not in general config.
- Safety should be driven by the rendered context payload, not by user-managed per-section numbers.
- When the safety budget forces omission, keep `Goal`, `Key Decisions`, and current task state before lower-priority historical detail.
- Documentation should describe `context.md` as an internal generated artifact, not a user-configurable rendering system.
- Regression coverage should assert legacy config compatibility explicitly so future schema cleanup does not accidentally re-break old user files.

## Current State
- Status: ready
- Total tasks: 3
- Completed: 0
- Pending: 3
- Failed: 0
- Blocked: 0

## Completed Work
- No completed work yet.

## Pending Work
- Task 1: remove-context-config-surface [pending] — Remove the public `context` config section while preserving backward-compatible loading of existing config files that still contain it.
- Task 2: internalize-project-context-bounds [pending] — Replace user-configurable `context.md` rendering limits with an internal safety policy that keeps RAF resilient to model context overflow.
- Task 3: refresh-docs-and-regression-coverage [pending] — Bring documentation and automated coverage in line with the removed `context` config surface and the new internal project-context behavior.

## Source Files
- input.md
- plans/
- outcomes/
