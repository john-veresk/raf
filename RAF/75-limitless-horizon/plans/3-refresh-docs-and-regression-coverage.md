---
effort: medium
---
# Task: Refresh Docs And Regression Coverage

## Objective
Bring documentation and automated coverage in line with the removed `context` config surface and the new internal project-context behavior.

## Requirements
- Remove stale `context` config references from user-facing docs and prompts, especially `README.md` and `src/prompts/config-docs.md`.
- Update config tests to cover the new legacy-ignore behavior and the absence of `context` from the supported schema.
- Update project-context tests to cover the new internal safety policy instead of config-driven section limits.
- Clean up command tests and mocks that currently stub `getResolvedConfig().context` so they reflect the new resolved-config shape.
- Keep the test suite focused on the behavioral contract: no public `context` config, silent legacy-file compatibility, and bounded project-context generation.

## Key Decisions
- Documentation should describe `context.md` as an internal generated artifact, not a user-configurable rendering system.
- Regression coverage should assert legacy config compatibility explicitly so future schema cleanup does not accidentally re-break old user files.

## Acceptance Criteria
- [ ] README and config docs no longer advertise a `context` config section.
- [ ] Unit tests cover ignoring legacy `context` blocks during config load/validation.
- [ ] Unit tests cover the new project-context safety behavior and no longer rely on removed config fields.
- [ ] Plan-command/config-command test fixtures no longer stub nonexistent `context` config.

## Dependencies
- 1
- 2

## Files to Modify
- `README.md`
- `src/prompts/config-docs.md`
- `tests/unit/config.test.ts`
- `tests/unit/config-command.test.ts`
- `tests/unit/project-context.test.ts`
- `tests/unit/plan-command-codex-resume.test.ts`
- `tests/unit/plan-command-auto-flag.test.ts`

## Risks & Mitigations
- Docs and tests can lag behind the code and leave RAF looking half-migrated.
- Mitigation: make legacy-compatibility and internal-safety behavior explicit in both prose and regression assertions.

