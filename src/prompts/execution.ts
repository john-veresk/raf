import { getCommitFormat, getCommitPrefix, renderCommitMessage } from '../utils/config.js';
import { extractProjectName } from '../utils/paths.js';
import { summarizeOutcome } from '../core/outcome-summary.js';

export { summarizeOutcome } from '../core/outcome-summary.js';

export interface ExecutionPromptParams {
  projectPath: string;
  planPath: string;
  taskId: string;
  taskNumber: number;
  totalTasks: number;
  autoCommit: boolean;
  projectNumber: string;
  outcomeFilePath: string;
  contextContent: string;
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
    autoCommit,
    projectNumber,
    outcomeFilePath,
    contextContent,
    attemptNumber = 1,
    previousOutcomeFile,
    dependencyIds = [],
    dependencyOutcomes = [],
  } = params;

  // Encode task number to plain numeric string
  const paddedTaskNumber = taskNumber.toString();
  const contextPath = `${projectPath}/context.md`;

  // Build example commit message from config template
  const commitTemplate = getCommitFormat('task');
  const commitPrefix = getCommitPrefix();
  const projectName = extractProjectName(projectPath) ?? projectNumber;
  const exampleCommit = renderCommitMessage(commitTemplate, {
    prefix: commitPrefix,
    projectId: projectName,  // backwards compat: {projectId} resolves to projectName
    projectName,
    taskId: paddedTaskNumber,
    description: '<description>',
  });

  const commitInstructions = autoCommit
    ? `
## Git Instructions

After successfully completing the task:
1. Stage only the files you modified during this task:
   - Add each code file you changed: \`git add <file1> <file2> ...\`
   - Add the outcome file: \`git add ${outcomeFilePath}\`
   - Add this task's plan file: \`git add ${planPath}\`
   - If you updated shared project context, add it too: \`git add ${contextPath}\`
2. Commit with message: "${exampleCommit}"
   - Write a concise description of what was accomplished
   - Focus on the actual change, not the task name
   - The commit message must be a SINGLE LINE — no body, no trailers
   - Do NOT add Co-Authored-By or any other trailers to the commit message
3. Immediately verify that the commit landed before writing \`<promise>COMPLETE</promise>\`
   - Confirm the commit succeeded
   - Run \`git show --stat --oneline -1\` and verify it includes the task's code changes, \`${outcomeFilePath}\`, \`${planPath}\`, and \`${contextPath}\` if you updated it
   - Do not write \`<promise>COMPLETE</promise>\` until that verification passes

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
${retryContextSection}
## Project Context

${contextContent}

## Instructions

### Step 1: Read the Plan

Read the plan file to understand exactly what needs to be done.

### Step 2: Execute the Task

Follow the implementation steps in the plan:
- Write clean, maintainable code following existing patterns
- Follow any CLAUDE.md instructions
- If you encounter blockers, try to resolve them before giving up
${dependencyContextSection}
### Step 3: Verify Completion

Before marking the task complete:
- Check all acceptance criteria from the plan
- Run any relevant tests
- Ensure no regressions were introduced
${commitInstructions}
### Step 4: Write Outcome File

**Outcome file path**: \`${outcomeFilePath}\`

If the task changes the project-level shared context, update \`${contextPath}\` yourself. RAF will not regenerate it for you. On successful tasks, also add \`${outcomeFilePath}\` to \`## Project Files\` with a note about when future agents should inspect it.

The outcome file must contain:
1. A summary of what was done
2. Key changes made (files modified, features added, etc.)
3. A \`## Decision Updates\` section. Record any execution-time decision change, deviation, or explicitly say none.
4. Any important notes or follow-up items
5. The completion marker as the LAST line (exactly one marker per file)

**For documentation/report tasks**: The outcome IS the deliverable — include the full content.

The outcome file MUST end with one of these markers:

On success:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

On failure (do NOT commit — just write the outcome and stop):
\`\`\`
<promise>FAILED</promise>
Reason: [explain why the task failed]
\`\`\`

Do not mark COMPLETE if there are failing tests or unmet criteria.`;
}
