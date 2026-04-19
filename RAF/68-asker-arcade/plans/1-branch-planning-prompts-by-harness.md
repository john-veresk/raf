---
effort: medium
---
# Task: Branch Planning Prompts by Harness

## Objective
Make RAF planning and amendment prompts emit the correct interview-tool instructions for Claude vs Codex without changing the rest of the planning workflow.

## Requirements
- Thread the active harness into `getPlanningPrompt(...)` and `getAmendPrompt(...)` from `src/commands/plan.ts`.
- Keep Claude behavior explicitly tied to `AskUserQuestion`.
- For Codex, replace that instruction with `request_user_input` and describe the expected interaction shape: short architectural questions first, 2-3 exclusive choices when possible, append every answer to `decisions.md`.
- Do not broaden the Codex wording into a new planning methodology; keep this to tool naming and usage expectations only.
- Preserve all existing project-path interpolation, amendment rules, protected-task handling, and plan template content.

## Acceptance Criteria
- [ ] Claude planning prompt contains `AskUserQuestion` and not `request_user_input`.
- [ ] Codex planning prompt contains `request_user_input` and not `AskUserQuestion`.
- [ ] Claude amend prompt contains `AskUserQuestion` and not `request_user_input`.
- [ ] Codex amend prompt contains `request_user_input` and not `AskUserQuestion`.
- [ ] Existing prompt tests are updated to assert the harness-specific wording instead of a single hardcoded tool name.

## Context
Current prompt builders in `src/prompts/planning.ts` and `src/prompts/amend.ts` are Claude-specific even when `models.plan.harness = "codex"`. That makes Codex planning sessions ask for the wrong tool by name before any runner-level fixes are applied.

## Implementation Steps
1. Extend prompt-builder params with the selected harness.
2. Add a small helper or shared constant for the harness-dependent interview-tool instruction so the plan and amend prompts cannot drift.
3. Update call sites in `src/commands/plan.ts`.
4. Update `tests/unit/planning-prompt.test.ts` and `tests/unit/amend-prompt.test.ts` to cover both harnesses.

## Files to Modify
- `src/prompts/planning.ts`
- `src/prompts/amend.ts`
- `src/commands/plan.ts`
- `tests/unit/planning-prompt.test.ts`
- `tests/unit/amend-prompt.test.ts`

## Risks & Mitigations
- Risk: prompt branching accidentally changes unrelated wording and breaks existing assertions.
- Mitigation: isolate the harness-dependent sentence and keep the surrounding prompt text untouched.
