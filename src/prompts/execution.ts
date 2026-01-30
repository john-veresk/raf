export interface ExecutionPromptParams {
  projectPath: string;
  planPath: string;
  taskId: string;
  taskNumber: number;
  totalTasks: number;
  previousOutcomes: Array<{ taskId: string; content: string }>;
  autoCommit: boolean;
  projectName: string;
  projectNumber: string;
  taskName: string;
  outcomeFilePath?: string;
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
    projectName,
    projectNumber,
    taskName,
    outcomeFilePath,
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
2. Commit with message: "RAF[${projectNumber}:${paddedTaskNumber}] ${projectName} ${taskName}"
${outcomeFilePath ? `\nNote: The outcome file will be written to \`${outcomeFilePath}\` by RAF after your commit.` : ''}
`
    : '';

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
### Step 4: Signal Completion

**CRITICAL**: You MUST output one of these markers at the end:

If the task was completed successfully:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

If the task failed and cannot be completed:
\`\`\`
<promise>FAILED</promise>
Reason: [explain why the task failed]
\`\`\`

## Important Rules

1. ALWAYS read the plan file first
2. Follow the plan precisely
3. Do not skip any acceptance criteria
4. If you encounter blockers, try to resolve them
5. Output EXACTLY ONE completion marker
6. The completion marker MUST be the last thing you output

## Error Handling

If you encounter errors:
- Try to fix them yourself first
- If an error prevents completion, output FAILED with a clear reason
- Do not output COMPLETE if there are failing tests or unmet criteria`;
}
