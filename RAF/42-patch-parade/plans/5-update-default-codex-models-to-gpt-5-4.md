---
effort: low
---
# Task: Update Default Codex Models to GPT-5.4

## Objective
Set every Codex default model entry in RAF's current config schema to the literal model string `gpt-5.4`.

## Context
RAF currently stores Codex defaults in `codexModels` and `codexEffortMapping` under `DEFAULT_CONFIG`. The user wants every Codex slot to use the same default model string `gpt-5.4`, including planning, execution, name generation, failure analysis, PR generation, config assistance, and effort-based task routing. This task is intentionally narrow and updates the existing split-provider schema without redesigning it.

## Dependencies
1

## Requirements
- Update every `DEFAULT_CONFIG.codexModels.*` entry to `gpt-5.4`.
- Update every `DEFAULT_CONFIG.codexEffortMapping.*` entry to `gpt-5.4`.
- Keep Claude defaults unchanged.
- Update any config docs, examples, or tests that currently assert older Codex defaults such as `gpt-5.3-codex`.
- Do not preserve scenario-specific Codex exceptions; all Codex defaults should be the same literal model string.

## Implementation Steps
1. Update `src/types/config.ts` so every Codex default model slot and Codex effort-mapping slot resolves to `gpt-5.4`.
2. Search for docs, prompt docs, and tests that embed the previous Codex defaults and update them to match the new default config.
3. Verify that provider-aware resolution still reads the same config keys and now returns `gpt-5.4` for every default Codex path.

## Acceptance Criteria
- [ ] `DEFAULT_CONFIG.codexModels.plan`, `.execute`, `.nameGeneration`, `.failureAnalysis`, `.prGeneration`, and `.config` are all `gpt-5.4`.
- [ ] `DEFAULT_CONFIG.codexEffortMapping.low`, `.medium`, and `.high` are all `gpt-5.4`.
- [ ] Claude defaults remain unchanged.
- [ ] Any documentation or tests that mention old Codex defaults are updated.
- [ ] All tests pass

## Notes
Task 6 is expected to replace this split-provider schema later. Keep this task focused on default values only and avoid schema changes here.
