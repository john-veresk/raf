---
effort: medium
---
# Task: Restore Codex Fast Config

## Objective
Reintroduce `fast?: boolean` on RAF model entries as an omitted-by-default, Codex-only config knob.

## Requirements
- Add `fast?: boolean` to the shared `ModelEntry` shape used by both `models.*` and `effortMapping.*`.
- Keep the default state omitted/falsy; do not stamp `fast: false` into every concrete `DEFAULT_CONFIG` model entry.
- Make schema-based config tooling recognize `models.*.fast` and `effortMapping.*.fast` as valid keys for `raf config set/get`.
- Accept `fast` only on `harness: "codex"` entries.
- Reject Claude entries that set `fast` with a clear validation error instead of silently ignoring them.
- Preserve current deep-merge behavior so partial overrides still inherit sibling fields like `model` and `harness`.

## Acceptance Criteria
- [ ] `ModelEntry` supports an optional `fast` field without changing the resolved defaults for existing configs.
- [ ] `validateConfig()` accepts `fast: true/false` on Codex entries and rejects it on Claude entries.
- [ ] `raf config set models.plan.fast true` and `raf config set effortMapping.medium.fast true` resolve through the schema.
- [ ] Merging user config leaves `fast` undefined unless the user explicitly sets it.

## Context
The current tree removed fast mode entirely in project `59-ghost-signal`, so there is no surviving schema, validation, or merge support. This project is intentionally reviving only the config surface for Codex.

## Implementation Steps
1. Extend `ModelEntry` and the optional-key schema helpers in [`src/types/config.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/types/config.ts) so `fast` is a recognized optional field without becoming a concrete default on every entry.
2. Update [`src/utils/config.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/config.ts) to validate `fast`, enforce the Codex-only rule, and preserve the field through `mergeModelEntry()`.
3. Add or update config tests so both JSON-file validation and `raf config set` nested-path behavior cover `fast`.

## Files to Modify
- [`src/types/config.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/types/config.ts)
- [`src/utils/config.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/config.ts)
- [`tests/unit/config.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/config.test.ts)
- [`tests/unit/config-command.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/config-command.test.ts)

## Risks & Mitigations
- Optional-key/default conflict: RAF’s `DEFAULT_CONFIG` currently omits optional model-entry fields. Add `fast` to the schema helper path rather than hardcoding `false` into every default entry.
- Validation drift: reject Claude `fast` at config-validation time so runtime code does not need a second layer of Claude-specific guard logic.

## Notes
- This task is schema and config plumbing only. It should not reintroduce any Claude fast-mode runtime behavior.
