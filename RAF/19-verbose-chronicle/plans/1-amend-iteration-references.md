# Task: Amend Iteration References

## Objective
When amending a project, instruct the planning Claude to reference previous completed tasks (with outcome file paths) in the Context section of new plans that are follow-ups or fixes.

## Context
Currently, amendment mode shows existing tasks with their status (COMPLETED/PENDING/FAILED) but doesn't guide Claude to treat new tasks as iterations on previous work. When a user amends a project to fix or follow up on a completed task, the new plan should reference the previous task's outcome file so the executing agent has full context about what was done before.

## Requirements
- Update the amend system prompt in `src/prompts/amend.ts` to instruct Claude to:
  - Identify when new tasks are follow-ups, fixes, or iterations of previously completed tasks
  - Include a reference to the previous task's outcome file path in the Context section of the new plan
  - Use the format: "This is a follow-up to task NNN. See outcome: {projectPath}/outcomes/NNN-task-name.md"
- The existing tasks summary already includes task IDs and names — enhance it to also show the outcome file path for completed tasks so Claude has the information readily available
- This is purely a prompt engineering change — no programmatic detection logic needed
- Do NOT modify the plan template structure (no new dedicated fields) — use the existing Context section

## Implementation Steps
1. Read the current amend prompt in `src/prompts/amend.ts`
2. Enhance the `existingTasksSummary` generation to include outcome file paths for completed tasks
3. Add instructions in the system prompt (Step 2: Analyze New Requirements section) telling Claude to identify follow-up/fix tasks and reference previous outcomes in the Context section
4. Add an example in the prompt showing how to reference a previous task's outcome
5. Update tests for the amend prompt if any exist

## Acceptance Criteria
- [ ] Amend prompt includes outcome file paths for completed tasks in the task summary
- [ ] Prompt instructs Claude to identify follow-up/fix tasks and reference outcomes in Context section
- [ ] Existing amend functionality is not broken
- [ ] All tests pass

## Notes
- The outcome file path follows the pattern: `{projectPath}/outcomes/{taskId}-{taskName}.md`
- Only completed tasks have meaningful outcome files to reference
- The `AmendPromptParams` interface already includes `projectPath` which can be used to construct outcome paths
- The `existingTasks` array includes `planFile` from which the task name can be extracted for outcome path construction
