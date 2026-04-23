---
effort: medium
---
# Task: Update Context Prompt Contract

## Objective
Align RAF's planning and execution prompt contracts so `context.md` guidance forbids `## Current State` and requires completed tasks to add their outcome file paths to `## Project Files`.

## Requirements
- Verify the change stays in prompt, documentation, and test surfaces rather than introducing runtime `context.md` generation logic.
- Update shared `context.md` guidance used by planning and amend prompts so it no longer describes "current state" as part of durable project context and instead explicitly forbids a `## Current State` section.
- Preserve the existing `## Goal`, `## Key Decisions`, and `## Project Files` guidance, including the rule that `## Project Files` should use concrete file paths and explain when to inspect them.
- Update the execution prompt so a successful task that updates project-level shared context is told to add the current task's outcome file path to `## Project Files` in `context.md`.
- Keep the execution prompt's existing commit and outcome-file workflow intact aside from the new `context.md` maintenance requirement.
- Update prompt tests to cover the stricter `## Current State` prohibition and the new completed-outcome `## Project Files` instruction.
- Update README guidance for `context.md` so product documentation matches the new prompt contract.

## Key Decisions
- Scope is limited to prompt text, tests, and docs because `src/core/project-context.ts` confirms RAF reads `context.md` verbatim instead of generating sections automatically.
- `## Current State` is forbidden outright instead of being replaced with another required section.
- The execution contract should add the just-completed task's outcome file path, not maintain only a curated subset of outcomes.

## Acceptance Criteria
- [x] Planning and amend prompt guidance explicitly tells agents not to use a `## Current State` section in `context.md`.
- [x] Execution prompt guidance explicitly tells agents to add the current task's outcome file path to `## Project Files` when they update `context.md` after a successful task.
- [x] Existing prompt guidance for `## Goal`, durable `## Key Decisions`, and concrete `## Project Files` entries remains intact.
- [x] Unit tests cover both the removed `## Current State` guidance and the new completed-outcome-path instruction.
- [x] README documentation for `context.md` matches the updated guidance.

## Context
The current codebase does not generate `context.md`, but the prompt contract still shapes how planning and execution agents maintain it. `src/prompts/shared.ts` currently describes durable context as including the project's "current state," which conflicts with the requested removal of that section. `src/prompts/execution.ts` tells executors to update `context.md` if needed, but it does not explicitly require adding the newly completed outcome file path into `## Project Files`.

## Implementation Steps
1. Update the shared `PROJECT_CONTEXT_RULES` wording in `src/prompts/shared.ts` so durable context guidance forbids `## Current State` while preserving the existing `## Goal`, `## Key Decisions`, and `## Project Files` rules.
2. Update `src/prompts/execution.ts` to tell the executor that when project-level context changes, `context.md` should also add the current task's outcome file path to `## Project Files`.
3. Adjust planning, amend, and execution prompt tests to assert the new contract and remove assertions that depend on "current state" wording.
4. Refresh the README `context.md` description so it mirrors the revised guidance.

## Files to Modify
- `src/prompts/shared.ts`
- `src/prompts/execution.ts`
- `tests/unit/planning-prompt.test.ts`
- `tests/unit/amend-prompt.test.ts`
- `tests/unit/execution-prompt.test.ts`
- `README.md`

## Risks & Mitigations
- Prompt-only changes can drift from docs or test expectations.
  Mitigation: update README and prompt unit tests in the same task.
- A broad "add outcome paths" instruction could accidentally encourage dumping every source file into `## Project Files`.
  Mitigation: preserve the existing concrete-file-path and relevance guidance from `PROJECT_CONTEXT_RULES`.

## Notes
- `RAF/74-context-anchor/context.md` contains a historical example with `## Current State`, but it is project data, not a prompt source. This task should not rewrite past project artifacts unless tests or docs directly depend on them.
