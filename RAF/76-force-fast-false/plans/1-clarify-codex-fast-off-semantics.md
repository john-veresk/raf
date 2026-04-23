---
effort: low
---
# Task: Clarify Codex Fast Off Semantics

## Objective
Document and regression-test that RAF treats unset or `false` Codex `fast` as an omitted `service_tier` override rather than sending an explicit off value.

## Requirements
- Preserve the current runtime behavior where Codex CLI arguments include `-c service_tier="fast"` only when RAF resolves `fast` to `true`.
- Document that Codex-off/default semantics are represented by omitting `service_tier`, not by sending `service_tier=false`.
- Cover both omitted `fast` and explicit `fast: false` in tests for every RAF-owned Codex launch path touched by the existing feature surface.
- Keep RAF's config shape boolean-based for this project; do not replace `fast` with a richer service-tier enum here.

## Key Decisions
- The user chose not to change Codex runtime behavior after reconciling the request against upstream Codex semantics.
- `fast` stays an optional RAF config field; missing values remain meaningful and should not be materialized into `DEFAULT_CONFIG`.
- "All Codex paths" still matters for coverage and docs, even though the resolved behavior is "omit the override unless `fast === true`."

## Acceptance Criteria
- [ ] README and config reference text explain that Codex fast mode is opt-in and that unset or `false` `fast` leaves `service_tier` omitted.
- [ ] Unit coverage proves `CodexRunner` does not append any `service_tier` override when `fast` is missing or explicitly `false`.
- [ ] Unit coverage proves Codex-backed name generation also omits `service_tier` when `fast` is missing or `false`.
- [ ] Existing positive-path tests for `fast: true` still pass unchanged.

## Context
RAF already defaults `fast` to `false` in runner-local state, but upstream Codex models `service_tier` as an optional explicit preference rather than a boolean toggle. The planning interview resolved the conflict by preserving omission as the off/default behavior and turning this project into a docs-and-tests hardening pass.

## Implementation Steps
1. Update the user-facing docs in `README.md` and `src/prompts/config-docs.md` so they explicitly say that `fast` only emits a Codex override when `true`, while `false` or omission means no `service_tier` flag is sent.
2. Extend `tests/unit/codex-runner.test.ts` with negative-path assertions for constructor defaulting and explicit `fast: false` in both interactive and non-interactive runs.
3. Extend `tests/unit/name-generator.test.ts` so Codex-backed name generation proves the same omission semantics for missing and explicit-false `fast`.
4. Run the targeted unit tests for the touched files and confirm the existing `fast: true` cases still cover the enabled path.

## Files to Modify
- `README.md`
- `src/prompts/config-docs.md`
- `tests/unit/codex-runner.test.ts`
- `tests/unit/name-generator.test.ts`

## Risks & Mitigations
- Upstream terminology drift: mirror the current Codex wording closely enough that future service-tier changes are easy to spot during maintenance.
- False confidence from config-only tests: add runner and name-generation assertions so the behavior is locked at the actual CLI argument boundary.

## Notes
- The current code trace already shows the runtime omission behavior in `src/core/codex-runner.ts` and `src/utils/name-generator.ts`; this task should avoid changing that logic unless a failing test exposes an actual inconsistency.
