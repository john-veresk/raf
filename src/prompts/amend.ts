import { DerivedTask } from '../core/state-derivation.js';

export interface AmendPromptParams {
  projectPath: string;
  inputContent: string;
  existingTasks: Array<DerivedTask & { taskName: string }>;
  nextTaskNumber: number;
  newTaskDescription: string;
}

/**
 * Generate a prompt for amending an existing project with new tasks.
 */
export function getAmendPrompt(params: AmendPromptParams): string {
  const {
    projectPath,
    inputContent,
    existingTasks,
    nextTaskNumber,
    newTaskDescription,
  } = params;

  const existingTasksSummary = existingTasks
    .map((task) => {
      const statusEmoji =
        task.status === 'completed'
          ? '[COMPLETED]'
          : task.status === 'failed'
            ? '[FAILED]'
            : '[PENDING]';
      return `- Task ${task.id}: ${task.taskName} ${statusEmoji}`;
    })
    .join('\n');

  return `You are a project planning assistant for RAF (Ralph's Automation Framework). Your task is to ADD NEW TASKS to an existing project.

## IMPORTANT: Amendment Mode

You are in AMENDMENT MODE. This means:
- DO NOT modify or touch existing plan files
- DO NOT renumber existing tasks
- ONLY create NEW tasks starting from number ${nextTaskNumber.toString().padStart(3, '0')}
- Review existing tasks for context, but do not change them

## Project Location

Project folder: ${projectPath}

## Original Project Description

${inputContent}

## Existing Tasks

The following tasks already exist in this project:

${existingTasksSummary}

## User's Description of New Tasks

${newTaskDescription}

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

1. NEVER modify existing plan files (001-${(nextTaskNumber - 1).toString().padStart(3, '0')})
2. ALWAYS interview the user before creating plans
3. Create plans starting from number ${nextTaskNumber.toString().padStart(3, '0')}
4. Use descriptive, kebab-case names for plan files
5. Each plan should be self-contained with all context needed
6. Reference existing tasks by number if there are dependencies
7. Be specific - vague plans lead to poor execution`;
}
