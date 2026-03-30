# Outcome: Inject Council Mode Prompt

## Summary

When `councilMode` is enabled in config, a council mode prompt section is appended to both planning and amend system prompts, instructing the planner to act as a team leader coordinating sub-agents.

## Key Changes

- **`src/prompts/planning.ts`**: Added `councilMode` to `PlanningPromptParams`; when enabled, appends a Council Mode section instructing the leader to spawn per-task sub-agents, consolidate questions, and write all final plan files
- **`src/prompts/amend.ts`**: Added `councilMode` to `AmendPromptParams`; same council section adapted for amend context (includes existing tasks context and respects existing task numbering)
- **`src/commands/plan.ts`**: Imported `getCouncilMode()` and passes it to both `getPlanningPrompt()` and `getAmendPrompt()`

## Notes

- When `councilMode: false` (default), prompts are completely unchanged
- The council section is appended at the end of the system prompt as a single block
- Sub-agents are forbidden from using AskUserQuestion — only the leader communicates with the user
- The sub-agent prompt template is a suggestion; the leader can adjust based on project needs

<promise>COMPLETE</promise>
