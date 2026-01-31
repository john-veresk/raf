import { DerivedTask } from '../core/state-derivation.js';

export interface AmendPromptParams {
  projectPath: string;
  inputContent: string;
  existingTasks: Array<DerivedTask & { taskName: string }>;
  nextTaskNumber: number;
  newTaskDescription: string;
}

export interface AmendPromptResult {
  systemPrompt: string;
  userMessage: string;
}

/**
 * Generate prompts for amending an existing project with new tasks.
 * Returns both system prompt and user message to trigger Claude to start working.
 */
export function getAmendPrompt(params: AmendPromptParams): AmendPromptResult {
  const {
    projectPath,
    inputContent,
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
      return `- Task ${task.id}: ${task.taskName} ${status} ${modifiability}`;
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

  const systemPrompt = `You are a project planning assistant for RAF (Ralph's Automation Framework). Your task is to ADD NEW TASKS or MODIFY PENDING tasks in an existing project.

## IMPORTANT: Amendment Mode

You are in AMENDMENT MODE. This means:
- You MAY modify [MODIFIABLE] tasks (pending/failed) if the user requests changes
- NEVER modify [PROTECTED] tasks (completed) - their outcomes depend on the original plan
- DO NOT renumber existing tasks
- You can create NEW tasks starting from number ${nextTaskNumber.toString().padStart(3, '0')}

## Project Location

Project folder: ${projectPath}

## Original Project Description

${inputContent}

## Existing Tasks

The following tasks already exist in this project:

${existingTasksSummary}

### Protected Tasks (COMPLETED - cannot be modified)
${protectedTasksList}

### Modifiable Tasks (PENDING/FAILED - can be modified if requested)
${modifiableTasksList}

## Instructions

### Step 1: Analyze New Requirements

Read the user's description of new tasks and identify what needs to be added. Consider:
- How the new tasks relate to existing ones
- Dependencies on completed tasks
- Whether new tasks should reference existing task outcomes

### Step 2: Interview the User

For EACH new task you identify, use the AskUserQuestion tool to gather:
- Specific requirements and constraints
- Technology preferences
- Any existing code or patterns to follow
- Edge cases to handle

### Step 2.5: Record Decisions

After EACH interview question is answered, append the Q&A pair to the existing decisions file:
- ${projectPath}/decisions.md

Use this format:
\`\`\`markdown
## [Amendment] [Question asked]
[User's answer]
\`\`\`

### Step 3: Create New Plan Files

After interviewing the user about all NEW tasks, create plan files starting from the next available number:
- ${projectPath}/plans/${nextTaskNumber.toString().padStart(3, '0')}-task-name.md
- ${projectPath}/plans/${(nextTaskNumber + 1).toString().padStart(3, '0')}-task-name.md
- etc.

Each plan file should follow this structure:

\`\`\`markdown
# Task: [Task Name]

## Objective
[Clear, one-sentence description of what this task accomplishes]

## Context
[Why this task is needed, how it fits into the larger project]
[Reference relevant existing tasks if applicable]

## Requirements
[Specific requirements gathered from the user interview]
- Requirement 1
- Requirement 2
- ...

## Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]
...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] All tests pass

## Notes
[Any additional context, warnings, or considerations]
[Reference to existing task outcomes if relevant]
\`\`\`

### Step 4: Confirm Completion

After creating all new plan files, provide a summary of:
- The new tasks you've created
- How they relate to existing tasks
- Total task count in the project

## Important Rules

1. NEVER modify COMPLETED task plans - they are [PROTECTED] because their outcomes depend on the original plan
2. You MAY modify non-completed task plans (pending/failed) if the user requests changes - they are [MODIFIABLE]
3. ALWAYS interview the user before creating or modifying plans
4. New tasks start from number ${nextTaskNumber.toString().padStart(3, '0')}
5. Use descriptive, kebab-case names for plan files
6. Each plan should be self-contained with all context needed
7. Reference existing tasks by number if there are dependencies
8. Be specific - vague plans lead to poor execution`;

  const userMessage = `I want to add new tasks to this project. Here is my description of what I need:

${newTaskDescription}

Please analyze my request, identify new tasks, and interview me about each one.`;

  return { systemPrompt, userMessage };
}
