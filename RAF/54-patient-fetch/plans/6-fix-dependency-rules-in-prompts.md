---
effort: low
---
# Task: Fix Dependency Rules in Planning and Amend Prompts

## Objective
Update both planning and amend prompts to enforce that dependency IDs must be lower than the task ID, and include outcome file paths inline in the Dependencies section.

## Context
Currently, the planning and amend prompts tell the planner to "only reference lower-numbered tasks" but don't explicitly state that dependency IDs must be numerically less than the target task ID. This has led to invalid plans (e.g., task 36 depending on task 39). Additionally, when a task depends on completed tasks, the plan should include direct links to their outcome files so the executor has immediate context.

## Requirements
- Add explicit rule: dependency IDs must be strictly less than the task's own ID (e.g., task 5 can depend on 1-4, never on 5+)
- Include a concrete invalid example: "Task 36 CANNOT depend on task 39"
- Update the Dependencies section format in the plan template to include outcome file paths
- New format: `1 (see outcomes/1-task-name.md), 3 (see outcomes/3-task-name.md)`
- For tasks whose outcomes don't exist yet (new tasks depending on other new tasks), just list the ID without a path
- Apply identical changes to both `src/prompts/planning.ts` and `src/prompts/amend.ts`

## Implementation Steps
1. Open `src/prompts/planning.ts`
2. Update the Dependencies line in the plan template from:
   `[Optional — omit if none. Comma-separated task IDs, e.g., "1, 2"]`
   to:
   `[Optional — omit if none. Comma-separated task IDs with outcome links for completed tasks, e.g., "1 (see outcomes/1-setup-db.md), 3 (see outcomes/3-add-api.md)"]`
3. Update the **Dependencies** instruction block (around line 84) to add the explicit rule:
   - "A task's dependency IDs must be strictly lower than its own ID. For example, task 36 CANNOT depend on task 39."
   - "For dependencies on completed tasks, include the outcome file path inline: `ID (see outcomes/ID-task-name.md)`"
4. Apply the same changes to `src/prompts/amend.ts` (template around line 122, instructions section)
5. In the amend prompt, the completed tasks are already listed — instruct the planner to use those task names to construct the outcome file paths

## Acceptance Criteria
- [ ] Both `src/prompts/planning.ts` and `src/prompts/amend.ts` include the dependency ID < task ID rule
- [ ] Both prompts include a concrete invalid example (task 36 cannot depend on 39)
- [ ] Plan template shows the new Dependencies format with outcome file paths
- [ ] TypeScript compiles cleanly (`tsc --noEmit`)

## Notes
- The execution prompt (`src/prompts/execution.ts`) already injects dependency outcomes at runtime via `dependencyContextSection`. The plan-level outcome links serve a different purpose: they give the planner visibility into what was accomplished and help the executor find context even before the runtime injection.
- The `state-derivation.ts` file parses dependencies from plan files — verify that the parser (`parseDependencies`) handles the new format `"1 (see outcomes/1-foo.md), 3"` correctly, or update it to strip the parenthetical before parsing IDs.
