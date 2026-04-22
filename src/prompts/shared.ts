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
[Optional — planning-time decisions, constraints, or reconciled interview answers that the executor must preserve]

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

export function getInterviewInstructions(harness: HarnessName, projectPath: string): string {
  if (harness === 'codex') {
    return `Use the request_user_input tool. Ask short architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after. When possible, present 2-3 mutually exclusive choices instead of open-ended prompts.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

Record the final planning decisions in the relevant plan file's \`## Key Decisions\` section. RAF will summarize them into \`${projectPath}/context.md\`.

Once the interview settles the actual project direction, update \`${projectPath}/context.md\`'s \`## Goal\` section to a clarified summary of the work. Do not copy raw prompt text verbatim from \`input.md\` unless that is already the best summary.`;
  }

  return `Use the AskUserQuestion tool. Ask architectural/foundational questions first (data shapes, module boundaries, current state of the code) and tactical questions only after.

When the task description conflicts with what the code actually does, reconcile the contradiction with the user before proceeding.

Record the final planning decisions in the relevant plan file's \`## Key Decisions\` section. RAF will summarize them into \`${projectPath}/context.md\`.

Once the interview settles the actual project direction, update \`${projectPath}/context.md\`'s \`## Goal\` section to a clarified summary of the work. Do not copy raw prompt text verbatim from \`input.md\` unless that is already the best summary.`;
}
