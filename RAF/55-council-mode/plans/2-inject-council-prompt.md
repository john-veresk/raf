---
effort: medium
---
# Task: Inject Council Mode Prompt into Planning and Amend Prompts

## Objective
When `councilMode` is enabled, inject additional prompt instructions into both planning and amend system prompts that tell the planner to spawn a team of sub-agents.

## Context
The planning session runs inside Claude Code, which has access to the `Agent` tool. When council mode is on, we add prompt text instructing the planner to act as a team leader — spawning sub-agents per task, collecting their questions, batching them to the user, and merging results.

## Dependencies
1

## Requirements
- Conditional prompt injection: only when `councilMode` config is `true`
- Works for both `getPlanningPrompt()` and `getAmendPrompt()`
- Leader coordinates all user-facing questions (sub-agents don't ask the user directly)
- Sub-agents are assigned per-task (each investigates specific tasks)
- Leader reviews, merges, and writes final plan files
- The agent decides how many sub-agents to spin up (not hardcoded)

## Implementation Steps

1. **`src/prompts/planning.ts`** — Add `councilMode` to `PlanningPromptParams`:
   ```typescript
   export interface PlanningPromptParams {
     projectPath: string;
     inputContent: string;
     worktreeMode?: boolean;
     councilMode?: boolean;
   }
   ```

2. **`src/prompts/planning.ts`** — Build a council mode prompt section and append it to `systemPrompt` when enabled. Insert it after the Rules section:
   ```typescript
   const councilSection = params.councilMode ? `

   ## Council Mode

   You are operating in **council mode**. Instead of investigating all tasks yourself, act as a **team leader** coordinating a council of planning agents.

   ### How to run the council

   1. **Analyze the project description** and identify the distinct tasks (Step 1 above).
   2. **Spawn sub-agents** using the Agent tool — one agent per task (or group small related tasks). Decide the number of agents based on the number of tasks identified. Run agents in parallel where possible.
      - Each agent's prompt must include: the full project description, the specific task(s) to investigate, the project path, and instructions to report back (a) a draft plan for their task(s) and (b) a list of questions they need answered by the user.
      - Sub-agents must NOT use AskUserQuestion — they report questions back to you.
   3. **Collect results** from all sub-agents.
   4. **Consolidate questions** — deduplicate and batch all questions from sub-agents. Use AskUserQuestion to ask the user, grouping related questions together (up to 4 per call).
   5. **Distribute answers** — if any sub-agent needs user answers to refine their plan, send the answers back via SendMessage.
   6. **Review and merge** — review all draft plans from sub-agents. Ensure consistency, correct dependency ordering, and proper formatting.
   7. **Write final plan files** yourself — you (the leader) write all plan files to \`${projectPath}/plans/\`. Do not let sub-agents write files directly.
   8. **Record all Q&A** to \`${projectPath}/decisions.md\` as specified in Step 2 above.

   ### Sub-agent prompt template

   When spawning each sub-agent, use a prompt like:
   \`\`\`
   You are a planning analyst investigating task(s) for a software project.

   Project description:
   <description>
   {full project description}
   </description>

   Your assigned task(s) to investigate:
   {task name and brief description}

   Instructions:
   1. Explore the codebase to understand the current state relevant to your task(s).
   2. Identify implementation approach, key files to modify, and specific steps.
   3. List any questions you need the user to answer (you cannot ask them directly).
   4. Return a structured report with:
      - Draft plan (following the plan file format)
      - Questions for the user (numbered list)
      - Any risks or concerns
   \`\`\`

   ### Important
   - You (the leader) are the ONLY agent that talks to the user via AskUserQuestion.
   - You (the leader) write ALL final plan files. Sub-agents only return draft content.
   - Ensure dependency IDs are consistent across all plans after merging.` : '';
   ```

   Then append `councilSection` to the end of `systemPrompt`.

3. **`src/prompts/amend.ts`** — Same pattern. Add `councilMode` to `AmendPromptParams`:
   ```typescript
   export interface AmendPromptParams {
     projectPath: string;
     existingTasks: Array<DerivedTask & { taskName: string }>;
     nextTaskNumber: number;
     newTaskDescription: string;
     councilMode?: boolean;
   }
   ```

   Add the same council section (adjusted for amend context — sub-agents also receive existing task context). Append to the amend system prompt when enabled.

4. **`src/commands/plan.ts`** — Import `getCouncilMode` and pass it to both prompt generators:
   ```typescript
   import { getCouncilMode } from '../utils/config.js';

   // In runPlanCommand(), when calling getPlanningPrompt:
   const { systemPrompt, userMessage } = getPlanningPrompt({
     projectPath,
     inputContent: userInput,
     councilMode: getCouncilMode(),
   });

   // In runAmendCommand(), when calling getAmendPrompt:
   const { systemPrompt, userMessage } = getAmendPrompt({
     projectPath,
     existingTasks,
     nextTaskNumber,
     newTaskDescription: cleanInput,
     councilMode: getCouncilMode(),
   });
   ```

## Acceptance Criteria
- [ ] When `councilMode: false` (default), planning/amend prompts are unchanged
- [ ] When `councilMode: true`, the council mode section is appended to both planning and amend system prompts
- [ ] Council prompt instructs leader to spawn per-task sub-agents
- [ ] Council prompt forbids sub-agents from using AskUserQuestion
- [ ] Council prompt instructs leader to write all final plan files
- [ ] `plan.ts` reads `getCouncilMode()` and passes it to both prompt generators

## Notes
- The council prompt for amend mode should also include context about existing tasks (which are already in the amend prompt's system prompt, so sub-agents inherit it via the leader's prompt).
- Keep the council section as a single block appended at the end — don't interleave with existing prompt sections.
- The sub-agent prompt template is a suggestion for the leader, not enforced. The leader can adjust based on the specific project.
