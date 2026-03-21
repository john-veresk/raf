---
effort: high
---
# Task: Unify Model Config Schema

## Objective
Replace RAF's provider-split model configuration with a single provider-aware object schema that stores `model`, `reasoningEffort`, and `provider` together.

## Context
RAF currently spreads model selection across a top-level `provider`, string-valued `models`, string-valued `effortMapping`, and separate Codex-specific `codexModels` / `codexEffortMapping` sections. Existing pending tasks 1 and 2 make that split work correctly, but the user now wants a breaking schema change: every configurable model entry should become an object such as `{ model: "opus", reasoningEffort: "high", provider: "claude" }`, with no top-level `provider` field and no separate Codex-only config branches. This task should preserve the decision from task 5 that Codex defaults use `gpt-5.4`, while removing support for the old config shape and the RAF CLI model-selection flags such as `--model` and `--sonnet`.

## Dependencies
1, 2, 5

## Requirements
- Change the config schema so model-bearing entries are objects with `model`, `reasoningEffort`, and `provider`.
- Remove the top-level `provider` config field.
- Remove `codexModels` and `codexEffortMapping`.
- Remove the old string-only model config shape instead of supporting both schemas in parallel.
- Remove RAF CLI flags that let users pick a model directly, including `--model`, `--sonnet`, and related validation/help text.
- Preserve the remaining command behavior by resolving provider and model from the selected config object for each scenario.
- Keep the config provider-agnostic so users can mix Claude and Codex entries freely across scenarios and effort levels.
- Add new tests for the new config schema covering validation, default resolution, effort-based resolution, merge behavior, and rejection of removed legacy keys/flags.
- Update user-facing docs and config docs to reflect the breaking schema change and the removed model-selection flags.

## Implementation Steps
1. Redesign the config types in `src/types/config.ts` around a reusable provider-aware model object and update `DEFAULT_CONFIG` to the new shape.
2. Rewrite config validation and merge logic in `src/utils/config.ts` to accept only the new schema, reject removed keys, and resolve scenario/effort selections from structured model objects.
3. Refactor callers such as `src/commands/plan.ts`, `src/commands/do.ts`, name generation, failure analysis, and PR generation so they consume provider/model pairs from the new config objects instead of top-level provider plus split mappings.
4. Remove RAF CLI model override flags and the related validation paths, while keeping internal provider-runner calls intact.
5. Carry forward task 5's default decision by making every default Codex-backed config entry use `gpt-5.4` within the new object schema.
6. Update `README.md`, config documentation, and command help to document the new schema and removed flags.
7. Add focused automated coverage for the new schema and resolution paths, including failure cases for legacy keys and removed CLI flags.

## Acceptance Criteria
- [ ] Config defaults use provider-aware model objects instead of plain strings.
- [ ] `provider`, `codexModels`, and `codexEffortMapping` are removed from the supported config schema.
- [ ] RAF no longer accepts `--model`, `--sonnet`, or equivalent user-facing model-selection flags.
- [ ] Scenario-based model resolution and effort-based task resolution both read the new object schema correctly.
- [ ] Default Codex-backed entries in the new schema use `gpt-5.4`.
- [ ] New tests cover the new schema, merge behavior, resolution behavior, and rejection of removed legacy keys/flags.
- [ ] User-facing docs describe the new schema and no longer document removed flags.
- [ ] All tests pass

## Notes
This is an intentional breaking change. Do not add migration compatibility or fallback support for the removed config keys. Assume the existing `--provider` command flag remains unless implementation shows it is fully redundant; the explicit user request only removed direct model-selection flags.
