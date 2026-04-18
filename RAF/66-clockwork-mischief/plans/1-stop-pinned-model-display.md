---
effort: medium
---
# Task: Stop Expanding Aliases To Pinned Model IDs

## Objective
Make RAF’s user-facing model display reflect the configured identifier unless RAF has a concrete full model ID from config or provider output.

## Context
The current ceiling banner and verbose task-model logs call `formatModelDisplay(..., { fullId: true })`, which resolves aliases through a static map in `src/utils/config.ts`. That is why `opus` currently prints as `claude-opus-4-6`, even though RAF did not obtain that version from Claude CLI at runtime.

Local exploration found no pre-run Claude CLI command in the current integration that resolves `opus` to a concrete full model ID without actually making a Claude request. Until RAF has a real provider-sourced full ID, displaying a pinned version is misleading.

## Requirements
- Remove static alias-to-full-ID expansion from user-facing logs and shared display helpers.
- If the config/frontmatter already contains a full model ID, preserve and display it unchanged.
- Apply the same fallback-to-alias rule across both harnesses:
  `opus` stays `opus`, `sonnet` stays `sonnet`, `codex` stays `codex`, `gpt54` stays `gpt54`.
- Do not change model validation, frontmatter parsing, or ceiling tier comparison semantics.
- Update documentation so alias behavior is described as provider-default / unpinned, and full-version display is described as requiring an explicit full model ID.

## Acceptance Criteria
- [ ] `raf do` shows `Ceiling: opus (claude)` when `models.execute.model` is `opus`.
- [ ] Verbose task-model logs keep aliases for alias-configured models and keep explicit full IDs when those are configured.
- [ ] Codex aliases are no longer normalized to guessed canonical IDs in user-facing display.
- [ ] No user-facing helper claims to know a full version for an alias unless RAF already has that full ID.
- [ ] Unit tests cover both Claude and Codex alias display behavior.

## Implementation Steps
1. Reconcile the display API in `src/utils/config.ts`.
   Decide whether `fullId: true` should be removed, renamed, or redefined so it cannot silently invent provider versions from aliases.
2. Update all user-facing `raf do` display sites that currently request guessed full IDs, especially:
   `src/commands/do.ts` ceiling banner and `formatResolvedTaskModel()`.
3. Keep explicit full IDs and provider-reported raw model IDs unchanged in display paths.
4. Update docs that currently imply aliases resolve to pinned versions:
   `src/prompts/config-docs.md` and any README/config examples that describe alias expansion rather than explicit version pinning.
5. Update tests to reflect the new semantics instead of the pinned map behavior.

## Files to Modify
- `src/utils/config.ts`
- `src/commands/do.ts`
- `src/prompts/config-docs.md`
- `tests/unit/config.test.ts`
- `tests/unit/do-model-display.test.ts`

## Risks & Mitigations
- Risk: display-only cleanup accidentally changes execution semantics.
  Mitigation: keep tier comparison and runner model selection logic untouched; limit changes to display helpers and their callers.
- Risk: docs still describe aliases as concrete versions.
  Mitigation: update the alias/full-ID sections together with the helper changes, not as a follow-up.

## Notes
- Raw provider-reported model IDs in usage data, token tracking, and stream output should remain untouched. This task is about RAF’s synthetic display layer, not provider payload normalization.
