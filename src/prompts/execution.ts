/**
 * Maximum characters for a dependency outcome summary.
 * Outcomes larger than this will be truncated to avoid context bloat.
 */
const MAX_DEPENDENCY_OUTCOME_CHARS = 4000;

/**
 * Summarize an outcome for dependency context.
 * Extracts the key sections (Summary, Key Changes, Notes) and truncates if needed.
 */
export function summarizeOutcome(content: string): string {
  // If content is small enough, return as-is
  if (content.length <= MAX_DEPENDENCY_OUTCOME_CHARS) {
    return content;
  }

  // Try to extract just the Summary section
  const summaryMatch = content.match(/^## Summary\s*\n([\s\S]*?)(?=\n## |$)/m);
  if (summaryMatch && summaryMatch[1]) {
    const summary = summaryMatch[1].trim();
    if (summary.length > 0 && summary.length <= MAX_DEPENDENCY_OUTCOME_CHARS) {
      return `## Summary\n\n${summary}\n\n*[Outcome truncated for context size]*`;
    }
  }

  // Fallback: truncate the full content
  const truncated = content.substring(0, MAX_DEPENDENCY_OUTCOME_CHARS);
  // Find a good break point (newline or period)
  const lastNewline = truncated.lastIndexOf('\n');
  const lastPeriod = truncated.lastIndexOf('. ');
  const breakPoint = Math.max(lastNewline, lastPeriod);

  if (breakPoint > MAX_DEPENDENCY_OUTCOME_CHARS / 2) {
    return truncated.substring(0, breakPoint + 1) + '\n\n*[Outcome truncated for context size]*';
  }

  return truncated + '\n\n*[Outcome truncated for context size]*';
}

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
  /** Task IDs that this task depends on */
  dependencyIds?: string[];
  /** Outcomes of dependency tasks, keyed by task ID */
  dependencyOutcomes?: Array<{ taskId: string; content: string }>;
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
    dependencyIds = [],
    dependencyOutcomes = [],
  } = params;

  let outcomesSection = '';
  if (previousOutcomes.length > 0) {
    outcomesSection = `
## Previous Task Outcomes

The following tasks have already been completed. Review them for context and to avoid duplication:

${previousOutcomes.map((o) => `### Task ${o.taskId}\n${o.content}`).join('\n\n')}
`;
  }

  // Encode task number to 2-char base36
  const paddedTaskNumber = taskNumber.toString(36).padStart(2, '0');

  const commitInstructions = autoCommit
    ? `
## Git Instructions

After successfully completing the task:
1. Stage only the files you modified during this task:
   - Add each code file you changed: \`git add <file1> <file2> ...\`
   - Add the outcome file: \`git add ${outcomeFilePath}\`
   - Add this task's plan file: \`git add ${planPath}\`
2. Commit with message: "RAF[${projectNumber}:${paddedTaskNumber}] <description>"
   - Write a concise description of what was accomplished
   - Focus on the actual change, not the task name
   - The commit message must be a SINGLE LINE — no body, no trailers
   - Do NOT add Co-Authored-By or any other trailers to the commit message

**IMPORTANT - On Failure**: If the task fails, do NOT commit. Just write the outcome file with the \`<promise>FAILED</promise>\` marker and stop. Uncommitted changes will be preserved for debugging.
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

  // Generate dependency context section if task has dependencies
  let dependencyContextSection = '';
  if (dependencyIds.length > 0 && dependencyOutcomes.length > 0) {
    const depOutcomesFormatted = dependencyOutcomes.map((o) => {
      const summarized = summarizeOutcome(o.content);
      return `### Task ${o.taskId}\n${summarized}`;
    }).join('\n\n');

    dependencyContextSection = `
## Dependency Context

This task depends on the following completed tasks. Review their outcomes to understand what was accomplished and build upon their work:

**Dependencies**: ${dependencyIds.join(', ')}

${depOutcomesFormatted}
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
- Follow any CLAUDE.md instructions
${dependencyContextSection}${outcomesSection}
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
7. On SUCCESS: Commit code changes AND outcome file together BEFORE you finish
8. On FAILURE: Do NOT commit - just write the outcome file with FAILED marker

## Error Handling

If you encounter errors:
- Try to fix them yourself first
- If an error prevents completion, write the outcome file with FAILED status and a clear reason
- Do not mark COMPLETE if there are failing tests or unmet criteria`;
}
