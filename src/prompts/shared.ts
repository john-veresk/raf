/**
 * Shared prompt constants composed by planning and amend prompts.
 * No runtime behaviour — pure string exports.
 */

import type { HarnessName } from '../types/config.js';

export const PLANNING_PRINCIPLES = `## Planning Principles

- **Verify premise.** Before proposing any change, confirm the problem actually exists in the current code — don't plan a fix for a bug you haven't located.
- **Trace lifecycle.** Follow the full call chain from entry point to effect; a partial trace leads to plans that break at integration.
- **Prefer existing knobs.** Reach for existing config keys, flags, and abstractions before introducing new ones.
- **Lean-first draft.** Start with the smallest plan that could satisfy the requirement; add sections only when they carry real information.
- **Architecture before tactics.** Settle data shapes and module boundaries before writing step-by-step instructions.
- **Plans aren't essays.** Omit prose that restates the obvious; every sentence must help the executor make a decision.
- **Reconcile, don't ratify.** When the new work conflicts with an existing decision, surface the conflict and resolve it — don't silently paper over it.`;

export const PLAN_TEMPLATE = `Each plan file uses this structure. Required sections are marked; include optional sections only when they add real information.

\`\`\`markdown
---
effort: medium
---
# Task: [Task Name]

## Objective
[REQUIRED — one sentence]

## Requirements
[REQUIRED — bulleted list]

## Key Decisions
[Optional — durable project, product, code, API, or architecture decisions the executor must preserve; exclude planning tactics, task sequencing, commit choreography, and other execution-process notes]

## Acceptance Criteria
[REQUIRED — checkboxes]

## Context
[Optional — why this task is needed and how it fits the larger project]

## Dependencies
[Optional — omit if none. See DEPENDENCY_RULES.]

## Implementation Steps
[Optional — ordered steps; omit when the requirements are self-evident to the executor]

## Files to Modify
[Optional — omit when exploration surfaced nothing notable]

## Risks & Mitigations
[Optional — omit when exploration surfaced nothing notable]

## Notes
[Optional — warnings, references, follow-up items]
\`\`\`

**Frontmatter fields:**
- \`effort\` (REQUIRED): \`low\` (trivial/mechanical), \`medium\` (well-scoped feature work), \`high\` (architectural/complex)
- \`model\` (optional): Override effort-based model selection. Rarely needed — prefer \`effort\` so the user's config controls the model.`;

export const FLOW = `For each plan, draft the content in your scratchpad first, self-critique for missing steps and unhandled risks, revise, then write the file.`;

export const DEPENDENCY_RULES = `**Dependencies:** Infer automatically from task relationships — do not ask the user. A task's dependency IDs must be strictly lower than its own ID (task 36 cannot depend on task 39). List only direct dependencies, not transitive ones. Omit the section entirely if there are no prerequisites. For completed tasks, include the outcome file path inline: \`ID (see outcomes/ID-task-name.md)\`.`;

export const PROJECT_CONTEXT_RULES = `Treat \`context.md\` as shared project context, not a task-scoped brief for the latest request.

- Keep it centered on durable project state: the overall goal, current state, important decisions, and cross-task context other agents will need later.
- Do not turn it into a duplicate of one plan file or a summary of only the current amendment/request.
- Keep \`## Key Decisions\` reserved for durable project, product, code, API, and architecture decisions that future tasks must preserve.
- Do not put planning tactics, task sequencing, commit choreography, or other execution-process notes in \`## Key Decisions\`.
- If you include a \`## Project Files\` section, list concrete file paths future agents may need, such as \`input.md\`, \`context.md\`, \`plans/3-task-name.md\`, or \`outcomes/3-task-name.md\`.
- Each \`## Project Files\` entry should say when to inspect that file if it becomes relevant.
- Do not list bare directories or globs such as \`plans/\`, \`outcomes/\`, or \`src/**\`.
- In \`## Project Files\`, do not list implementation source files just because the current task will edit them; include source files only when they are genuinely project-defining references that future tasks must consult.`;

export function getInterviewInstructions(harness: HarnessName, projectPath: string): string {
  if (harness === 'codex') {
    return `Use the request_user_input tool. Ask short architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after. When possible, present 2-3 mutually exclusive choices instead of open-ended prompts.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

Record the final planning decisions in the relevant plan file's \`## Key Decisions\` section.

Maintain \`${projectPath}/context.md\` yourself as the canonical shared project context. Create it if missing, keep its \`## Goal\` section aligned with the clarified project direction as a clarified summary, and update any other sections you rely on. Do not copy raw prompt text verbatim from \`input.md\` unless that is already the best summary.

${PROJECT_CONTEXT_RULES}`;
  }

  return `Use the AskUserQuestion tool. Ask architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

Record the final planning decisions in the relevant plan file's \`## Key Decisions\` section.

Maintain \`${projectPath}/context.md\` yourself as the canonical shared project context. Create it if missing, keep its \`## Goal\` section aligned with the clarified project direction as a clarified summary, and update any other sections you rely on. Do not copy raw prompt text verbatim from \`input.md\` unless that is already the best summary.

${PROJECT_CONTEXT_RULES}`;
}
