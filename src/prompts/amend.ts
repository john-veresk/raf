import { DerivedTask } from '../core/state-derivation.js';
import { encodeTaskId } from '../utils/paths.js';

export interface AmendPromptParams {
  projectPath: string;
  existingTasks: Array<DerivedTask & { taskName: string }>;
  nextTaskNumber: number;
  newTaskDescription: string;
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

### Step 0: Explore the Codebase & Existing Project

Before identifying tasks or interviewing the user, perform a thorough exploration of the codebase. The goal is to ground every later decision in the actual code, not in assumptions.

Explore in parallel along three angles. If your harness supports spawning parallel sub-agents or sub-tasks, dispatch one for each angle and let them run concurrently. Otherwise, batch multiple file reads / searches in a single response so the work happens in parallel rather than sequentially.

1. **Existing code & architecture** — understand the modules, conventions, and patterns relevant to the user's request.
2. **Files to modify** — find every file that will need to be created or modified to fulfil the request.
3. **Risks, edge cases & dependencies** — identify what could go wrong, what existing behaviour might break, and what the work depends on.

In addition to the three exploration angles above, read the following amendment-specific context as part of the same parallel batch:
- \`${projectPath}/input.md\` — the original project description.
- \`${projectPath}/decisions.md\` — prior decisions, if it exists.
- For each task marked [PROTECTED] above: the corresponding \`${projectPath}/outcomes/<id>-<name>.md\` — for context only, these are immutable.
- For each task marked [MODIFIABLE] above: the corresponding \`${projectPath}/plans/<id>-<name>.md\` — these may be modified if the user requests it.

Synthesize the findings before moving on. The synthesis should inform the questions you ask in the interview and the contents of the plan files.

Reading PROTECTED outcomes is for context only — they are immutable. The Amendment Mode rules at the top of this prompt remain in force.

### Step 1: Analyze New Requirements

Consider how new tasks relate to existing ones and their dependencies. For follow-up/fix tasks, reference the previous task's outcome in the Context section:
\`This is a follow-up to task NN. See outcome: {projectPath}/outcomes/NN-task-name.md\`

### Step 2: Interview the User

For EACH new task, use AskUserQuestion to gather specific requirements, technology preferences, existing patterns, and edge cases. Ground your questions in the exploration findings — ask about ambiguities you actually saw in the code, not generic preferences.

After EACH answer, append the Q&A to \`${projectPath}/decisions.md\`:
\`\`\`markdown
## [Question asked]
[User's answer]
\`\`\`

### Step 3: Create New Plan Files

Create plan files starting from \`${projectPath}/plans/${encodeTaskId(nextTaskNumber)}-task-name.md\`. Use kebab-case names.

For each task, follow this loop before writing the plan file:
1. **Draft** the plan content in your scratchpad (do NOT write the file yet).
2. **Self-critique** the draft for missing steps, unhandled risks, and ordering problems. Pay special attention to whether the new task respects PROTECTED task boundaries. If your harness supports spawning a sub-agent, dispatch a critique sub-agent; otherwise critique inline in your reasoning.
3. **Revise** the draft based on the critique.
4. **Write** the plan file.

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

## Files to Modify
- \`path/to/file1.ext\` — what changes here
- \`path/to/file2.ext\` — what changes here

## Risks & Mitigations
- **Risk:** [risk discovered during exploration]
  **Mitigation:** [how the implementation step list addresses it]

## Notes
[Additional context, warnings, references to existing task outcomes]
\`\`\`

The \`## Files to Modify\` and \`## Risks & Mitigations\` sections are optional — omit them when exploration surfaced nothing notable for that task.

**Frontmatter fields:**
- \`effort\` (REQUIRED): \`low\` (trivial/mechanical), \`medium\` (well-scoped feature work), \`high\` (architectural/complex)
- \`model\` (optional): Override effort-based model selection. Rarely needed.

**Dependencies:** A task's dependency IDs must be strictly lower than its own ID — for example, task 36 CANNOT depend on task 39. Only direct dependencies, not transitive ones. Omit section if no prerequisites. For dependencies on completed tasks, include the outcome file path inline: \`ID (see outcomes/ID-task-name.md)\`. Use the completed task names listed above to construct the outcome file paths.

### Step 4: Confirm Completion

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

  const userMessage = `I want to add the following new tasks to this project:

${newTaskDescription}

Please analyze this and start the planning interview for the new tasks.`;

  return { systemPrompt, userMessage };
}
