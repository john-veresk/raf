# Project Context

## Goal
Clarify and lock RAF's Codex fast-mode semantics so `fast` remains a RAF-only boolean, omitted `fast` continues to mean Codex default/off at the CLI boundary, and the behavior is documented and regression-tested instead of changed to an explicit `service_tier=false` override.

## Key Decisions
- The user chose not to change Codex runtime behavior after reconciling the request against upstream Codex semantics.
- `fast` stays an optional RAF config field; missing values remain meaningful and should not be materialized into `DEFAULT_CONFIG`.
- "All Codex paths" still matters for coverage and docs, even though the resolved behavior is "omit the override unless `fast === true`."

## Current State
- Status: ready
- Total tasks: 1
- Completed: 0
- Pending: 1
- Failed: 0
- Blocked: 0

## Pending Work
- Task 1: clarify-codex-fast-off-semantics [pending] — Document and regression-test that RAF treats unset or `false` Codex `fast` as an omitted `service_tier` override rather than sending an explicit off value.

## Completed Work
- No completed work yet.

## Source Files
- input.md
- plans/
- outcomes/
