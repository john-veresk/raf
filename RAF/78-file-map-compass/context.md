# Project Context

## Goal
Update RAF's planning and amend guidance so shared project `context.md` uses `## Project Files` instead of `## Relevant Files`, requires explicit file-path entries that tell the executor to inspect each file if relevant, and keeps `## Key Decisions` focused on durable project, product, code, API, and architecture decisions rather than planning tactics.

## Key Decisions
- `## Key Decisions` stays as the section name for downstream consumers, but its meaning should narrow to durable project, product, code, API, and architecture choices.
- Planning-process notes, task sequencing, commit choreography, and task-organization guidance should be excluded from `## Key Decisions`.
- `## Project Files` entries should be concrete file paths rather than bare folders or globs, and each entry should tell the reader when to inspect that file.
- The contract change should stay aligned across prompt templates, docs, prompt-viewer fixtures, and regression tests so planning guidance does not drift between surfaces.
- RAF should not revive the removed automatic `context.md` generator just to satisfy stale tests; any stale coverage should be reconciled with the current read-only `context.md` lifecycle.

## Current State
- Status: ready
- Total tasks: 1
- Completed: 0
- Pending: 1
- Failed: 0
- Blocked: 0

## Pending Work
- Task 1: tighten-context-structure-guidance [pending] — Update prompt instructions, supporting docs, fixtures, and regression coverage so RAF consistently describes `context.md` with `## Project Files` and strict domain-level `## Key Decisions`.

## Completed Work
- No completed work yet.

## Project Files
- `input.md` — Read this if you need the raw user wording that led to the clarified goal above.
- `context.md` — Read this if you need the current durable project summary and reconciled decisions before editing plans or prompts.
- `plans/1-tighten-context-structure-guidance.md` — Read this before implementation because it captures the execution requirements and risks for the contract change.
- `src/prompts/shared.ts` — Inspect this when changing section names or planning/amend interview rules because it defines the shared prompt wording.
- `src/prompts/planning.ts` — Inspect this if shared prompt changes require planning-flow-specific updates or validation of the rendered system prompt.
- `src/prompts/amend.ts` — Inspect this if shared prompt changes require amend-flow-specific updates or validation of the rendered system prompt.
- `README.md` — Inspect this when updating public guidance about what `context.md` should contain.
- `prompt-viewer/generate.mjs` — Inspect this if sample project context text or prompt snapshots need to reflect the renamed section and stricter semantics.
- `prompt-viewer/prompts-data.js` — Inspect this if the checked-in prompt-viewer snapshot needs regeneration after prompt text changes.
- `tests/unit/planning-prompt.test.ts` — Inspect this when updating planning prompt expectations for `## Project Files` and `## Key Decisions`.
- `tests/unit/amend-prompt.test.ts` — Inspect this when updating amend prompt expectations for `## Project Files` and `## Key Decisions`.
- `tests/unit/project-context.test.ts` — Inspect this if stale generated-context expectations conflict with the current read-only `context.md` contract surfaced by this project.
