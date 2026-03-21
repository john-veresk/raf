---
effort: high
---
# Task: Rename Provider To Harness

## Objective
Replace the `provider` terminology with `harness` everywhere in RAF's config schema, code, tests, prompts, and documentation without adding migration compatibility.

## Context
RAF currently models Claude vs Codex selection through `provider` fields and related helper/type names across config parsing, runner creation, command logging, and docs. The user wants that terminology renamed everywhere, not just in JSON config examples. This is a deliberate breaking change for a greenfield project, so the implementation should fully adopt `harness` instead of carrying both terms or adding migration support.

## Requirements
- Rename the per-model config field from `provider` to `harness` across the entire codebase.
- Rename internal TypeScript property names, helper parameters, validation paths, prompt/docs examples, README examples, and tests so `provider` is no longer the active term.
- Preserve existing behavior: RAF must still route model entries to the Claude or Codex CLI correctly after the rename.
- Do not add migration support, fallback parsing, or compatibility shims for the old `provider` key.
- Remove or rewrite validation/help text so user-facing config guidance refers to `harness`, not `provider`.
- Update `DEFAULT_CONFIG` in [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/types/config.ts) to use the new key, per project instructions.
- Update `README.md` and generated config docs because this changes the config API.
- Refresh automated coverage for config validation, config resolution, command logging, and any other code paths that assert on model-entry property names.

## Implementation Steps
1. Refactor config types in [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/types/config.ts) so model entries store `harness` instead of `provider`, and rename supporting types/interfaces/helpers where the old terminology is part of the public or internal API.
2. Update config parsing, validation, and merge logic in [src/utils/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/utils/config.ts) to accept only `harness`, reject stale `provider` keys naturally under the new schema, and keep scenario/effort resolution behavior intact.
3. Rename downstream call sites in commands, runners, name generation, validation, and core orchestration so they consume `entry.harness` consistently instead of `entry.provider`.
4. Update prompt/docs sources such as [src/prompts/config-docs.md](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/prompts/config-docs.md) and [README.md](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/README.md) to describe the new schema and examples using `harness`.
5. Rewrite affected tests to assert on `harness` terminology and current config behavior instead of the removed `provider` field.
6. Run the relevant test suites covering config, plan/do command model resolution, and docs/config command output; fix stale assertions that still encode the old terminology.

## Acceptance Criteria
- [ ] Config files and defaults use `harness` instead of `provider`.
- [ ] Active code paths no longer rely on `entry.provider` or equivalent provider-named config properties.
- [ ] User-facing docs, prompts, examples, and error/help text describe `harness`, not `provider`.
- [ ] RAF still resolves Claude vs Codex execution correctly after the rename.
- [ ] Tests covering config validation/resolution and command behavior pass with the renamed schema.
- [ ] All tests pass

## Notes
- Treat this as a full terminology migration inside the current codebase, not a narrow config-file alias.
- Because the user explicitly does not want migration support, avoid dual-read logic like `harness ?? provider`.
