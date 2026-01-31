export interface ExecutionPromptParams {
  projectPath: string;
  planPath: string;
  taskId: string;
  taskNumber: number;
  totalTasks: number;
  previousOutcomes: Array<{ taskId: string; content: string }>;
  autoCommit: boolean;
  projectNumber: string;
  outcomeFilePath: string;
  attemptNumber?: number;
  previousOutcomeFile?: string;
}

export function getExecutionPrompt(params: ExecutionPromptParams): string {
  const {
    projectPath,
    planPath,
    taskId,
    taskNumber,
    totalTasks,
    previousOutcomes,
    autoCommit,
    projectNumber,
    outcomeFilePath,
    attemptNumber = 1,
    previousOutcomeFile,
  } = params;

  let outcomesSection = '';
  if (previousOutcomes.length > 0) {
    outcomesSection = `
## Previous Task Outcomes

The following tasks have already been completed. Review them for context and to avoid duplication:

${previousOutcomes.map((o) => `### Task ${o.taskId}\n${o.content}`).join('\n\n')}
`;
  }

  // Zero-pad task number to 3 digits
  const paddedTaskNumber = taskNumber.toString().padStart(3, '0');

  const commitInstructions = autoCommit
    ? `
## Git Instructions

After successfully completing the task:
1. Stage all changes with \`git add -A\`
2. Commit with message: "RAF[${projectNumber}:${paddedTaskNumber}] <description>"
   - Write a concise description of what was accomplished
   - Focus on the actual change, not the task name
`
    : '';

  // Generate retry context section for attempt 2+
  let retryContextSection = '';
  if (attemptNumber > 1 && previousOutcomeFile) {
    retryContextSection = `
## Retry Context

This is attempt ${attemptNumber} at executing this task. The previous attempt produced an outcome file that you should review before starting.

**Previous outcome file**: ${previousOutcomeFile}

Please:
1. Read the previous outcome file first
2. Understand what was attempted and why it failed
3. Account for the previous failure in your approach
4. Avoid making the same mistakes
`;
  }

  return `You are executing a planned task for RAF (Ralph's Automation Framework).

## Task Information

- Task: ${taskNumber} of ${totalTasks}
- Task ID: ${taskId}
- Project folder: ${projectPath}

## Your Mission

1. Read the plan file at: ${planPath}
2. Execute the task according to the plan
3. Verify all acceptance criteria are met
4. Signal completion with the appropriate marker

## Instructions
${retryContextSection}
### Step 1: Read the Plan

First, read the plan file to understand exactly what needs to be done.

### Step 2: Execute the Task

Follow the implementation steps in the plan. Key guidelines:
- Write clean, maintainable code
- Follow existing code patterns in the project
- Add appropriate error handling
- Write tests if specified in the plan
- Follow any CLAUDE.md instructions if present
${outcomesSection}
### Step 3: Verify Completion

Before marking the task complete:
- Check all acceptance criteria from the plan
- Run any relevant tests
- Ensure no regressions were introduced
${commitInstructions}
### Step 4: Write Outcome File

**CRITICAL**: You MUST write an outcome file to document what was accomplished.

**Outcome file path**: \`${outcomeFilePath}\`

The outcome file should contain:
1. A summary of what was done
2. Key changes made (files modified, features added, etc.)
3. Any important notes or follow-up items
4. The completion marker as the LAST line

**For code tasks**: Summarize what was changed and why
**For documentation/report tasks**: The outcome IS the deliverable - include the full content

**CRITICAL**: The outcome file MUST end with one of these markers:

If the task was completed successfully, end the file with:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

If the task failed and cannot be completed, end the file with:
\`\`\`
<promise>FAILED</promise>
Reason: [explain why the task failed]
\`\`\`

## Important Rules

1. ALWAYS read the plan file first
2. Follow the plan precisely
3. Do not skip any acceptance criteria
4. If you encounter blockers, try to resolve them
5. The outcome file MUST contain EXACTLY ONE completion marker
6. The completion marker MUST be the LAST line in the outcome file

## Error Handling

If you encounter errors:
- Try to fix them yourself first
- If an error prevents completion, write the outcome file with FAILED status and a clear reason
- Do not mark COMPLETE if there are failing tests or unmet criteria`;
}
