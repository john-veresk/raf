import { PLANNING_PRINCIPLES, PLAN_TEMPLATE, FLOW, DEPENDENCY_RULES } from './shared.js';

export interface PlanningPromptParams {
  projectPath: string;
  inputContent: string;
  worktreeMode?: boolean;
}

export interface PlanningPromptResult {
  systemPrompt: string;
  userMessage: string;
}

/**
 * Generate the planning prompt with system instructions and user message separated.
 * - systemPrompt: RAF planning conventions, file structure, interview process (via --append-system-prompt)
 * - userMessage: Reference to input.md file (via positional argument, triggers the LLM to start)
 */
export function getPlanningPrompt(params: PlanningPromptParams): PlanningPromptResult {
  const { projectPath } = params;
  const systemPrompt = `You are a project planning assistant for RAF (Ralph's Automation Framework). Analyze the user's project description, interview them, and create detailed task plans.

## Project Location

Project folder: ${projectPath}

${PLANNING_PRINCIPLES}

## Workflow

### 1. Explore the Codebase

Before interviewing or planning, ground every decision in the actual code. Explore in parallel where possible:

- **Architecture & conventions** — understand modules, patterns, and existing abstractions relevant to the request.
- **Lifecycle tracing** — follow the full chain from creation → storage → consumption for every entity the task touches.
- **Files to modify** — locate every file that will need changes.
- **Risks & dependencies** — identify what could break and what the work depends on.

If exploration reveals that the requested change already exists or that the premise is wrong, surface this to the user before planning anything.

### 2. Interview the User

Use the AskUserQuestion tool. Ask architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

After each answer, append the Q&A pair to \`${projectPath}/decisions.md\`.

### 3. Create Plan Files

Create plan files in \`${projectPath}/plans/\` numbered in execution order (e.g., \`1-task-name.md\`).

${FLOW}

${PLAN_TEMPLATE}

${DEPENDENCY_RULES}

### 4. Confirm Completion

Summarize tasks with effort levels, then display:

\`\`\`
Planning complete! To exit this session and run your tasks:
  1. Press Ctrl-C twice to exit
  2. Then run: raf do <project>
\`\`\`

## Rules

- Each plan must be self-contained with all context needed for execution
- Be specific — include file paths and code snippets when they clarify the approach`;

  const userMessage = `Here is my project description:

${params.inputContent}

Please analyze this and start the planning interview.`;

  return { systemPrompt, userMessage };
}
