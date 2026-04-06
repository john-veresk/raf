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

## Instructions

### Step 0: Explore the Codebase

Before identifying tasks or interviewing the user, perform a thorough exploration of the codebase. The goal is to ground every later decision in the actual code, not in assumptions.

Explore in parallel along three angles. If your harness supports spawning parallel sub-agents or sub-tasks, dispatch one for each angle and let them run concurrently. Otherwise, batch multiple file reads / searches in a single response so the work happens in parallel rather than sequentially.

1. **Existing code & architecture** — understand the modules, conventions, and patterns relevant to the user's request.
2. **Files to modify** — find every file that will need to be created or modified to fulfil the request.
3. **Risks, edge cases & dependencies** — identify what could go wrong, what existing behaviour might break, and what the work depends on.

Synthesize the findings before moving on. The synthesis should inform the questions you ask in the interview and the contents of the plan files.

### Step 1: Identify and Order Tasks

Using the synthesis from Step 0, identify distinct tasks from the project description. Each task should be independently completable, have a clear outcome, and take roughly 10-30 minutes.

**Order tasks by logical execution order:** setup/foundation → core implementation → integration/extension → testing/validation.

### Step 2: Interview the User

For EACH task, use the AskUserQuestion tool to gather specific requirements, technology preferences, existing patterns to follow, and edge cases. Do not skip this step. Ground your questions in the exploration findings — ask about ambiguities you actually saw in the code, not generic preferences.

After EACH answer, append the Q&A pair to \`${projectPath}/decisions.md\`:
\`\`\`markdown
## [Question asked]
[User's answer]
\`\`\`

### Step 3: Create Plan Files

Create plan files in \`${projectPath}/plans/\` numbered in execution order (e.g., \`1-task-name.md\`, \`2-task-name.md\`). Use kebab-case names.

For each task, follow this loop before writing the plan file:
1. **Draft** the plan content in your scratchpad (do NOT write the file yet).
2. **Self-critique** the draft for missing steps, unhandled risks, and ordering problems. If your harness supports spawning a sub-agent, dispatch a critique sub-agent; otherwise critique inline in your reasoning.
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
[Why this task is needed, how it fits into the larger project]

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
[Additional context, warnings, or considerations]
\`\`\`

The \`## Files to Modify\` and \`## Risks & Mitigations\` sections are optional — omit them when exploration surfaced nothing notable for that task.

**Frontmatter fields:**
- \`effort\` (REQUIRED): \`low\` (trivial/mechanical), \`medium\` (well-scoped feature work), \`high\` (architectural/complex)
- \`model\` (optional): Override effort-based model selection. Rarely needed — prefer \`effort\` so the user's config controls the model.

**Dependencies:** Infer automatically from task relationships (don't ask the user). A task's dependency IDs must be strictly lower than its own ID — for example, task 36 CANNOT depend on task 39. Only direct dependencies, not transitive ones. Omit section if no prerequisites. For dependencies on completed tasks, include the outcome file path inline: \`ID (see outcomes/ID-task-name.md)\`.

### Step 4: Confirm Completion

Provide a summary with effort levels (e.g., "Task 1: setup-database (effort: low)"), then display:

\`\`\`
Planning complete! To exit this session and run your tasks:
  1. Press Ctrl-C twice to exit
  2. Then run: raf do <project>
\`\`\`

## Rules

- Each plan must be self-contained with all context needed for execution
- Be specific — vague plans lead to poor execution
- Include implementation details, code snippets, and file paths when they clarify the approach`;

  const userMessage = `Here is my project description:

${params.inputContent}

Please analyze this and start the planning interview.`;

  return { systemPrompt, userMessage };
}
