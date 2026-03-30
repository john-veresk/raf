---
effort: low
---
# Task: Simplify Council Mode Prompt

## Objective
Replace the verbose council mode sections in planning.ts and amend.ts with a short, tool-agnostic paragraph.

## Context
The current council sections (~50 lines each) contain detailed step-by-step instructions referencing specific Claude tools (Agent, AskUserQuestion, SendMessage) and include a full sub-agent prompt template. This is over-specified — Claude already knows how to use its tools. The prompt should just describe the *intent* (spawn agents, collect findings, consolidate) and let the model figure out the mechanics.

## Requirements
- Replace both council sections with the same short paragraph (3-5 bullet points)
- Remove all references to specific tools (Agent, AskUserQuestion, SendMessage)
- Remove the sub-agent prompt template
- Keep it tool-agnostic — describe what to do, not which tools to use
- Both `planning.ts` and `amend.ts` get the identical council section

## Implementation Steps

1. In `src/prompts/planning.ts` (lines 103-149), replace the `councilSection` string with:

```typescript
const councilSection = params.councilMode ? `

## Council Mode

You are operating in **council mode** as a team leader.

- Spawn sub-agents to investigate tasks in parallel
- Collect their draft plans and questions
- Consolidate and deduplicate questions, then interview the user
- Review, merge, and write all final plan files yourself` : '';
```

2. In `src/prompts/amend.ts` (lines 165-221), replace the `councilSection` string with the exact same content as above (using `params.councilMode` and `${encodeTaskId(nextTaskNumber)}` are no longer needed in the council section since the base prompt already handles task numbering).

3. Verify the project builds: `npm run build`

## Acceptance Criteria
- [ ] Council section in `planning.ts` is ~5 lines, no tool names
- [ ] Council section in `amend.ts` is identical to `planning.ts`
- [ ] No references to Agent, AskUserQuestion, SendMessage, or sub-agent prompt templates remain in either council section
- [ ] `npm run build` passes

## Notes
- The base system prompts in both files already contain all the specific instructions (plan file format, decisions.md recording, task numbering for amend). The council section only needs to flip the mode from "do it yourself" to "delegate to sub-agents".
