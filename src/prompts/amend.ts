import { PLANNING_PRINCIPLES, PLAN_TEMPLATE, FLOW, DEPENDENCY_RULES } from './shared.js';
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

${PLANNING_PRINCIPLES}

## Workflow

### 1. Explore the Codebase & Existing Project

Before interviewing or planning, ground every decision in the actual code. Explore in parallel where possible:

- **Architecture & conventions** — understand modules, patterns, and existing abstractions relevant to the request.
- **Lifecycle tracing** — follow the full chain from creation → storage → consumption for every entity the task touches.
- **Files to modify** — locate every file that will need changes.
- **Risks & dependencies** — identify what could break and what the work depends on.

Also read the following amendment-specific context in the same parallel batch:
- \`${projectPath}/input.md\` — the original project description.
- \`${projectPath}/decisions.md\` — prior decisions, if it exists.
- For each [PROTECTED] task: its outcome file (\`${projectPath}/outcomes/<id>-<name>.md\`) — for context only, immutable.
- For each [MODIFIABLE] task: its plan file (\`${projectPath}/plans/<id>-<name>.md\`) — may be modified if the user requests it.

If exploration reveals the premise is wrong or the change already exists, surface this to the user before planning.

### 2. Interview the User

Use the AskUserQuestion tool. Ask architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

After each answer, append the Q&A pair to \`${projectPath}/decisions.md\`.

### 3. Create Plan Files

Create plan files starting from \`${projectPath}/plans/${encodeTaskId(nextTaskNumber)}-task-name.md\`.

${FLOW} The critique must also check that new plans respect PROTECTED task boundaries.

${PLAN_TEMPLATE}

${DEPENDENCY_RULES}

### 4. Confirm Completion

Summarize new tasks with effort levels, their relation to existing tasks, and total task count. Then display:

\`\`\`
Planning complete! To exit this session and run your tasks:
  1. Press Ctrl-C twice to exit
  2. Then run: raf do <project>
\`\`\`

## Rules

- Each plan must be self-contained with all context needed for execution
- Be specific — include file paths and code snippets when they clarify the approach`;

  const userMessage = `I want to add the following new tasks to this project:

${newTaskDescription}

Please analyze this and start the planning interview for the new tasks.`;

  return { systemPrompt, userMessage };
}
