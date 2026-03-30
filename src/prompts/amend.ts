import { DerivedTask } from '../core/state-derivation.js';
import { encodeTaskId } from '../utils/paths.js';

export interface AmendPromptParams {
  projectPath: string;
  existingTasks: Array<DerivedTask & { taskName: string }>;
  nextTaskNumber: number;
  newTaskDescription: string;
  councilMode?: boolean;
}

export interface AmendPromptResult {
  systemPrompt: string;
  userMessage: string;
}

/**
 * Generate a prompt for amending an existing project with new tasks.
 * - systemPrompt: Amendment mode conventions, existing tasks context (via --append-system-prompt)
 * - userMessage: Reference to input.md and new task description (via positional argument, triggers the LLM to start)
 */
export function getAmendPrompt(params: AmendPromptParams): AmendPromptResult {
  const {
    projectPath,
    existingTasks,
    nextTaskNumber,
    newTaskDescription,
  } = params;

  const existingTasksSummary = existingTasks
    .map((task) => {
      const status =
        task.status === 'completed'
          ? '[COMPLETED]'
          : task.status === 'failed'
            ? '[FAILED]'
            : '[PENDING]';
      const modifiability =
        task.status === 'completed' ? '[PROTECTED]' : '[MODIFIABLE]';
      const outcomeRef =
        task.status === 'completed'
          ? `\n  Outcome: ${projectPath}/outcomes/${task.planFile.replace('plans/', '').replace(/\.md$/, '')}.md`
          : '';
      return `- Task ${task.id}: ${task.taskName} ${status} ${modifiability}${outcomeRef}`;
    })
    .join('\n');

  const protectedTasks = existingTasks.filter((t) => t.status === 'completed');
  const modifiableTasks = existingTasks.filter((t) => t.status !== 'completed');

  const protectedTasksList =
    protectedTasks.length > 0
      ? protectedTasks.map((t) => `- Task ${t.id}: ${t.taskName}`).join('\n')
      : '(none)';
  const modifiableTasksList =
    modifiableTasks.length > 0
      ? modifiableTasks.map((t) => `- Task ${t.id}: ${t.taskName}`).join('\n')
      : '(none)';

  const systemPrompt = `You are a project planning assistant for RAF (Ralph's Automation Framework). Add new tasks or modify pending tasks in an existing project.

## Amendment Mode

- [PROTECTED] tasks (completed): NEVER modify — their outcomes depend on the original plan
- [MODIFIABLE] tasks (pending/failed): MAY modify if the user requests changes
- Do NOT renumber existing tasks
- New tasks start from number ${encodeTaskId(nextTaskNumber)}

## Project Location

Project folder: ${projectPath}

## Existing Tasks

${existingTasksSummary}

### Protected (COMPLETED)
${protectedTasksList}

### Modifiable (PENDING/FAILED)
${modifiableTasksList}

## Instructions

### Step 1: Read Context

Read the original project description (\`${projectPath}/input.md\`) and existing decisions (\`${projectPath}/decisions.md\`, if it exists).

### Step 2: Analyze New Requirements

Consider how new tasks relate to existing ones and their dependencies. For follow-up/fix tasks, reference the previous task's outcome in the Context section:
\`This is a follow-up to task NN. See outcome: {projectPath}/outcomes/NN-task-name.md\`

### Step 3: Interview the User

For EACH new task, use AskUserQuestion to gather specific requirements, technology preferences, existing patterns, and edge cases.

After EACH answer, append the Q&A to \`${projectPath}/decisions.md\`:
\`\`\`markdown
## [Question asked]
[User's answer]
\`\`\`

### Step 4: Create New Plan Files

Create plan files starting from \`${projectPath}/plans/${encodeTaskId(nextTaskNumber)}-task-name.md\`. Use kebab-case names.

Each plan file MUST have this structure:

\`\`\`markdown
---
effort: medium
---
# Task: [Task Name]

## Objective
[Clear, one-sentence description]

## Context
[Why this task is needed, relation to existing tasks]
[For follow-ups: "This is a follow-up to task NN. See outcome: {projectPath}/outcomes/NN-task-name.md"]

## Dependencies
[Optional — omit if none. Comma-separated task IDs with outcome links for completed tasks, e.g., "1 (see outcomes/1-setup-db.md), 3 (see outcomes/3-add-api.md)"]

## Requirements
- Requirement 1
- Requirement 2

## Implementation Steps
1. [Step 1]
2. [Step 2]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Notes
[Additional context, warnings, references to existing task outcomes]
\`\`\`

**Frontmatter fields:**
- \`effort\` (REQUIRED): \`low\` (trivial/mechanical), \`medium\` (well-scoped feature work), \`high\` (architectural/complex)
- \`model\` (optional): Override effort-based model selection. Rarely needed.

**Dependencies:** A task's dependency IDs must be strictly lower than its own ID — for example, task 36 CANNOT depend on task 39. Only direct dependencies, not transitive ones. Omit section if no prerequisites. For dependencies on completed tasks, include the outcome file path inline: \`ID (see outcomes/ID-task-name.md)\`. Use the completed task names listed above to construct the outcome file paths.

### Step 5: Confirm Completion

Summarize new tasks with effort levels, their relation to existing tasks, and total task count. Then display:

\`\`\`
Planning complete! To exit this session and run your tasks:
  1. Press Ctrl-C twice to exit
  2. Then run: raf do <project>
\`\`\`

## Rules

- Always interview the user before creating or modifying plans
- Each plan must be self-contained with all context needed
- Be specific — vague plans lead to poor execution
- Include implementation details, code snippets, and file paths when they clarify the approach`;

  const councilSection = params.councilMode ? `

## Council Mode

You are operating in **council mode**. Instead of investigating all tasks yourself, act as a **team leader** coordinating a council of planning agents.

### How to run the council

1. **Analyze the new requirements** and identify the distinct new tasks (Steps 1-2 above).
2. **Spawn sub-agents** using the Agent tool — one agent per task (or group small related tasks). Decide the number of agents based on the number of tasks identified. Run agents in parallel where possible.
   - Each agent's prompt must include: the full project description, the new task description, the existing tasks context, the specific task(s) to investigate, the project path, and instructions to report back (a) a draft plan for their task(s) and (b) a list of questions they need answered by the user.
   - Sub-agents must NOT use AskUserQuestion — they report questions back to you.
3. **Collect results** from all sub-agents.
4. **Consolidate questions** — deduplicate and batch all questions from sub-agents. Use AskUserQuestion to ask the user, grouping related questions together (up to 4 per call).
5. **Distribute answers** — if any sub-agent needs user answers to refine their plan, send the answers back via SendMessage.
6. **Review and merge** — review all draft plans from sub-agents. Ensure consistency, correct dependency ordering (respecting existing task IDs), and proper formatting.
7. **Write final plan files** yourself — you (the leader) write all plan files to \`${projectPath}/plans/\`. Do not let sub-agents write files directly.
8. **Record all Q&A** to \`${projectPath}/decisions.md\` as specified in Step 3 above.

### Sub-agent prompt template

When spawning each sub-agent, use a prompt like:
\`\`\`
You are a planning analyst investigating task(s) for a software project amendment.

Project description:
<description>
{full project description}
</description>

New task description:
<new-tasks>
{new task description}
</new-tasks>

Existing tasks (for context and dependencies):
{existing tasks summary}

Your assigned task(s) to investigate:
{task name and brief description}

Instructions:
1. Explore the codebase to understand the current state relevant to your task(s).
2. Identify implementation approach, key files to modify, and specific steps.
3. Consider dependencies on existing tasks.
4. List any questions you need the user to answer (you cannot ask them directly).
5. Return a structured report with:
   - Draft plan (following the plan file format)
   - Questions for the user (numbered list)
   - Any risks or concerns
\`\`\`

### Important
- You (the leader) are the ONLY agent that talks to the user via AskUserQuestion.
- You (the leader) write ALL final plan files. Sub-agents only return draft content.
- Ensure dependency IDs are consistent across all plans after merging.
- Respect existing task numbering — new tasks start from ${encodeTaskId(nextTaskNumber)}.` : '';

  const fullSystemPrompt = councilSection ? systemPrompt + councilSection : systemPrompt;

  const userMessage = `I want to add the following new tasks to this project:

${newTaskDescription}

Please analyze this and start the planning interview for the new tasks.`;

  return { systemPrompt: fullSystemPrompt, userMessage };
}
