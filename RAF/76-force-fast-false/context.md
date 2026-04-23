# Project Context

## Goal
Clarify and lock RAF's Codex fast-mode semantics so `fast` remains a RAF-only boolean, omitted `fast` continues to mean Codex default/off at the CLI boundary, and the behavior is documented and regression-tested instead of changed to an explicit `service_tier=false` override.

## Key Decisions
- Keep RAF's `fast` field optional in config and do not materialize `fast: false` into `DEFAULT_CONFIG`.
- Apply the clarified semantics across all Codex entry points, but because Codex treats omission as off, no runtime propagation change is needed.
- Reconcile the original request against upstream Codex semantics by preserving omission for off/default instead of sending `service_tier=false`.

## Current State
- Status: planning
- Total tasks: 1
- Completed: 0
- Pending: 1
- Failed: 0
- Blocked: 0

## Pending Work
- `1-clarify-codex-fast-off-semantics.md` — document and regression-test that Codex off/default semantics are represented by omitting `service_tier`.

## Completed Work
- No completed work yet.

## Source Files
- input.md
- plans/
- outcomes/
