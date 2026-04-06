---
effort: medium
---
# Task: Adapt planning.ts and amend.ts with ultraplan workflow

## Objective
Rewrite the `systemPrompt` template literals in both `src/prompts/planning.ts` and `src/prompts/amend.ts` to incorporate ultraplan-style multi-agent codebase exploration, a per-task self-critique loop, and an expanded plan-file template — using harness-agnostic language so the same prompts work for both Claude and Codex.

## Context
RAF currently has two planning prompts:
- `src/prompts/planning.ts` — used by `raf plan` to interview the user and create initial plan files for a brand-new project.
- `src/prompts/amend.ts` — used by `raf plan --amend` to add new tasks (or modify pending tasks) to an already-planned project, while honouring [PROTECTED] (completed) and [MODIFIABLE] (pending/failed) task boundaries.

The user wants to take the workflow described in `ultraplan-prompt.md` (a multi-agent parallel exploration + critique loop originally written for Claude's `Task` tool and ExitPlanMode flow) and adapt it into both prompts. The adapted prompts must work for both runners RAF supports — `ClaudeRunner` and `CodexRunner` — so they cannot reference Claude-specific tool names or flows like `ExitPlanMode`/teleport. Exploration must run **before** the user interview so the LLM's questions are grounded in the actual code, and both prompts should be edited together in this single task so their wording stays copy-paste consistent.

## Requirements

### Shared (apply to both files)
- Insert a new "Step 0: Explore the Codebase" phase that runs before task identification and the user interview.
- Step 0 must instruct the LLM to perform parallel exploration along three angles (mirroring ultraplan):
  1. Understand the relevant existing code and architecture.
  2. Find all files that will need to be created or modified.
  3. Identify potential risks, edge cases, and dependencies.
- Phrasing must be harness-agnostic: do NOT name Claude's `Task` tool. Use language like "spawn parallel sub-agents/tasks if your harness supports them; otherwise read multiple files concurrently in a single response."
- Add a per-task self-critique loop to plan-file creation: for each plan, **draft → critique → revise → write**. The critique step should look for missing implementation steps, unhandled risks, and ordering problems. Do this *before* the file is written.
- Extend the embedded plan-file template with two NEW sections, both **optional** (omit when exploration surfaced nothing notable), inserted between `## Acceptance Criteria` and `## Notes`:

  ```markdown
  ## Files to Modify
  - `path/to/file1.ext` — what changes here
  - `path/to/file2.ext` — what changes here

  ## Risks & Mitigations
  - **Risk:** [risk discovered during exploration]
    **Mitigation:** [how the implementation step list addresses it]
  ```

- The Step 0 wording and the per-task critique loop wording must be **copy-paste identical** between the two files (modulo the amend-specific extensions described below) so the two prompts feel like a single coherent system.
- Do NOT add new parameters to `PlanningPromptParams` or `AmendPromptParams`. The interfaces stay as-is.
- Preserve the existing `userMessage` builders verbatim in both files.
- Do NOT introduce references to `ExitPlanMode`, `__ULTRAPLAN_TELEPORT_LOCAL__`, "Plan teleported", "remote execution", "open a pull request when done", or any other ultraplan artifact that doesn't apply to RAF's interactive interview flow.

### `src/prompts/planning.ts` specifics
- Final step order after the rewrite:
  1. Step 0: Explore the Codebase (NEW)
  2. Step 1: Identify and Order Tasks (existing) — prose at the top should reference the Step 0 synthesis: "Using the synthesis from Step 0, identify distinct tasks…"
  3. Step 2: Interview the User (existing) — add a sentence: "Ground your questions in the exploration findings — ask about ambiguities you actually saw in the code, not generic preferences."
  4. Step 3: Create Plan Files (existing, now with per-task critique loop and expanded template).
  5. Step 4: Confirm Completion (existing).

### `src/prompts/amend.ts` specifics
- Replace the existing "### Step 1: Read Context" with a combined "### Step 0: Explore the Codebase & Existing Project". This section uses the same parallel-exploration directive and the same three angles, **plus** an explicit fourth bullet for amendment-specific reads:
  - `${projectPath}/input.md` (original project description).
  - `${projectPath}/decisions.md` if it exists.
  - For each [PROTECTED] task, the corresponding `${projectPath}/outcomes/<id>-<name>.md`.
  - For each [MODIFIABLE] task, the corresponding `${projectPath}/plans/<id>-<name>.md`.
- Step 0 must end with a reminder: "Reading PROTECTED outcomes is for context only — they are immutable. The Amendment Mode rules at the top of this prompt remain in force."
- Final step order after the rewrite:
  1. Step 0: Explore the Codebase & Existing Project (NEW, replaces old Step 1).
  2. Step 1: Analyze New Requirements (was Step 2) — keep existing prose about referencing previous task outcomes for follow-ups.
  3. Step 2: Interview the User (was Step 3) — add the same "Ground your questions in the exploration findings…" sentence.
  4. Step 3: Create New Plan Files (was Step 4) — restructure with the per-task critique loop. The critique step should explicitly call out: "Pay special attention to whether the new task respects PROTECTED task boundaries."
  5. Step 4: Confirm Completion (was Step 5).
- Leave the `## Amendment Mode`, `## Project Location`, `## Existing Tasks`, `### Protected (COMPLETED)`, `### Modifiable (PENDING/FAILED)`, and `## Rules` blocks **completely unchanged** — they carry critical state that the rest of the prompt depends on.
- Preserve all amendment-specific rules verbatim:
  - [PROTECTED] (completed) tasks must NEVER be modified.
  - [MODIFIABLE] (pending/failed) tasks MAY be modified if the user requests it.
  - Existing tasks must not be renumbered.
  - New tasks start from `encodeTaskId(nextTaskNumber)`.
  - Follow-up tasks reference previous task outcomes in their Context section.
  - Dependency IDs must be strictly lower than the task's own ID.

## Implementation Steps
1. Open `src/prompts/planning.ts` and locate the `systemPrompt` template literal in `getPlanningPrompt`.
2. Insert a new "Step 0: Explore the Codebase" section immediately after the `## Instructions` heading and before the existing "Step 1: Identify and Order Tasks". Use this content as the basis (adapt tone for consistency with the rest of the prompt):

   ```markdown
   ### Step 0: Explore the Codebase

   Before identifying tasks or interviewing the user, perform a thorough exploration of the codebase. The goal is to ground every later decision in the actual code, not in assumptions.

   Explore in parallel along three angles. If your harness supports spawning parallel sub-agents or sub-tasks, dispatch one for each angle and let them run concurrently. Otherwise, batch multiple file reads / searches in a single response so the work happens in parallel rather than sequentially.

   1. **Existing code & architecture** — understand the modules, conventions, and patterns relevant to the user's request.
   2. **Files to modify** — find every file that will need to be created or modified to fulfil the request.
   3. **Risks, edge cases & dependencies** — identify what could go wrong, what existing behaviour might break, and what the work depends on.

   Synthesize the findings before moving on. The synthesis should inform the questions you ask in the interview and the contents of the plan files.
   ```

3. Update Step 1's opening prose in planning.ts to reference the Step 0 synthesis: "Using the synthesis from Step 0, identify distinct tasks from the project description…".
4. In Step 2 (Interview the User) of planning.ts, add: "Ground your questions in the exploration findings — ask about ambiguities you actually saw in the code, not generic preferences."
5. Restructure Step 3 (Create Plan Files) of planning.ts to embed a per-task draft → critique → revise → write loop. Add this guidance verbatim:

   > For each task, follow this loop before writing the plan file:
   > 1. **Draft** the plan content in your scratchpad (do NOT write the file yet).
   > 2. **Self-critique** the draft for missing steps, unhandled risks, and ordering problems. If your harness supports spawning a sub-agent, dispatch a critique sub-agent; otherwise critique inline in your reasoning.
   > 3. **Revise** the draft based on the critique.
   > 4. **Write** the plan file.

6. Update the embedded plan-file template in planning.ts Step 3 to add the two new optional sections (`## Files to Modify`, `## Risks & Mitigations`) between `## Acceptance Criteria` and `## Notes`. Mark both as optional in the prose immediately following the template — explicitly say "omit them when exploration surfaced nothing notable for that task."
7. Save planning.ts. Now open `src/prompts/amend.ts` and locate the `systemPrompt` template literal in `getAmendPrompt`.
8. Replace the existing "### Step 1: Read Context" section in amend.ts with a "### Step 0: Explore the Codebase & Existing Project" section. Reuse the Step 0 wording from planning.ts verbatim, then append:

   ```markdown
   In addition to the three exploration angles above, read the following amendment-specific context as part of the same parallel batch:
   - `${projectPath}/input.md` — the original project description.
   - `${projectPath}/decisions.md` — prior decisions, if it exists.
   - For each task marked [PROTECTED] above: the corresponding `${projectPath}/outcomes/<id>-<name>.md` — for context only, these are immutable.
   - For each task marked [MODIFIABLE] above: the corresponding `${projectPath}/plans/<id>-<name>.md` — these may be modified if the user requests it.

   Reading PROTECTED outcomes is for context only — they are immutable. The Amendment Mode rules at the top of this prompt remain in force.
   ```

9. Renumber the remaining steps in amend.ts so the order becomes: Step 0 Explore → Step 1 Analyze → Step 2 Interview → Step 3 Create New Plan Files → Step 4 Confirm.
10. In Step 2 (Interview) of amend.ts, add the same "Ground your questions in the exploration findings…" sentence used in planning.ts.
11. Restructure Step 3 (Create New Plan Files) of amend.ts to embed the same draft → critique → revise → write loop, but with one additional bullet in the critique step: "Pay special attention to whether the new task respects PROTECTED task boundaries."
12. Update the embedded plan-file template in amend.ts Step 3 to add the same two new optional sections (`## Files to Modify`, `## Risks & Mitigations`) between `## Acceptance Criteria` and `## Notes`. Mark both optional with the same phrasing as planning.ts.
13. Verify nothing changed in the `## Amendment Mode`, `## Project Location`, `## Existing Tasks`, `### Protected`, `### Modifiable`, or `## Rules` blocks of amend.ts.
14. Run `npm run build` (or `tsc --noEmit`) to confirm both files still compile — there should be no type-level changes since we're only editing template literals.
15. Run any prompt-related tests if they exist (`npm test -- planning`, `npm test -- amend`) to confirm nothing snapshot-tests these strings.

## Acceptance Criteria
- [ ] `src/prompts/planning.ts` contains a "Step 0: Explore the Codebase" section listing three parallel exploration angles in harness-agnostic language (no `Task` tool or `ExitPlanMode` references).
- [ ] planning.ts step order: Step 0 Explore → Step 1 Identify → Step 2 Interview → Step 3 Create Plans (with per-task critique loop) → Step 4 Confirm.
- [ ] planning.ts Step 1 references "the synthesis from Step 0".
- [ ] planning.ts Step 2 contains the "Ground your questions in the exploration findings" sentence.
- [ ] planning.ts Step 3 contains the four-phase loop: Draft → Self-critique → Revise → Write.
- [ ] planning.ts plan-file template has `## Files to Modify` and `## Risks & Mitigations` sections between `## Acceptance Criteria` and `## Notes`, both marked optional in surrounding prose.
- [ ] `src/prompts/amend.ts` contains a "Step 0: Explore the Codebase & Existing Project" section that includes both the same three angles AND the amendment-specific reads (`input.md`, `decisions.md`, every PROTECTED outcome, every MODIFIABLE plan).
- [ ] amend.ts Step 0 ends with the "PROTECTED outcomes are immutable" reminder.
- [ ] amend.ts step order: Step 0 Explore → Step 1 Analyze → Step 2 Interview → Step 3 Create New Plans (with per-task critique loop including the PROTECTED-boundary check) → Step 4 Confirm.
- [ ] amend.ts plan-file template has the same `## Files to Modify` and `## Risks & Mitigations` optional sections.
- [ ] The `## Amendment Mode`, `## Project Location`, `## Existing Tasks`, `### Protected`, `### Modifiable`, and `## Rules` blocks in amend.ts are byte-identical to before this change.
- [ ] Step 0 wording and the per-task critique loop wording are copy-paste identical between planning.ts and amend.ts (only the amend-specific fourth bullet and the PROTECTED-boundary critique note differ).
- [ ] No reference to `ExitPlanMode`, `__ULTRAPLAN_TELEPORT_LOCAL__`, "Plan teleported", "remote execution", or "open a pull request when done" appears anywhere in either prompt.
- [ ] `PlanningPromptParams` and `AmendPromptParams` interfaces are unchanged; both `userMessage` builders are unchanged.
- [ ] `npm run build` (or `tsc --noEmit`) passes.

## Files to Modify
- `src/prompts/planning.ts` — rewrite the `systemPrompt` template literal inside `getPlanningPrompt` to add Step 0 exploration, restructure Step 3 with the per-task critique loop, and expand the plan-file template with two new optional sections.
- `src/prompts/amend.ts` — rewrite the `systemPrompt` template literal inside `getAmendPrompt` to replace "Step 1: Read Context" with the new Step 0 (including amendment-specific reads), restructure Step 3 with the per-task critique loop (with PROTECTED-boundary check), expand the plan-file template, and renumber remaining steps. Leave the Amendment Mode / Existing Tasks / Rules blocks untouched.

## Risks & Mitigations
- **Risk:** Codex doesn't support spawning parallel sub-agents the way Claude's `Task` tool does, so a literal "spawn sub-agents" instruction could confuse it.
  **Mitigation:** Use the conditional phrasing "if your harness supports spawning parallel sub-agents or sub-tasks, dispatch one for each angle … otherwise, batch multiple file reads / searches in a single response." Codex falls through to the second clause naturally.
- **Risk:** Forcing `Files to Modify` and `Risks & Mitigations` on every plan would push the LLM to invent placeholder content for trivial tasks, bloating plans.
  **Mitigation:** Mark both sections as optional in the prompt prose and explicitly tell the LLM to omit them when exploration surfaced nothing notable.
- **Risk:** A snapshot test or downstream consumer might depend on the exact text of either prompt.
  **Mitigation:** Step 15 of the implementation runs the test suite to catch any such dependency before completion.
- **Risk:** Wording drift between planning.ts and amend.ts since the same Step 0 and critique loop live in two files.
  **Mitigation:** Editing both files in this single task (rather than separate tasks) keeps the wording fresh in working memory. If drift becomes a long-term problem, a follow-up can extract the shared blocks into a helper exported from a sibling file. Out of scope here.
- **Risk:** Reading PROTECTED outcomes during exploration tempts the LLM to propose modifications to them.
  **Mitigation:** Step 0 in amend.ts ends with an explicit "they are immutable" reminder, and the existing `## Rules` block remains in force.
- **Risk:** Per-task critique loop materially increases planning latency and token spend.
  **Mitigation:** Out of scope for this task — the user explicitly asked for thorough planning. If it becomes a problem later it can be gated behind a config flag in a follow-up.

## Notes
- The original `ultraplan-prompt.md` lives at the repo root and contains references to `ExitPlanMode`, remote execution, and a teleport handshake. None of those apply to RAF's interactive planning flow — they were for a different invocation context. Strip them out completely; only the multi-agent exploration + critique pattern is being adapted.
- RAF's prompts already reference `AskUserQuestion` (a Claude tool name) in the existing interview steps and Codex copes with it fine. Use that as a precedent for tone, but do NOT introduce new Claude-specific tool names in Step 0 or the critique loop — the user's main ask was harness-agnostic phrasing for the new content.
- `src/core/codex-runner.ts:27` shows that Codex receives the system prompt prepended to the user message (via `buildCombinedPrompt`) — the prompt is still received in full, just plumbed differently. This confirms that whatever you write in the template literal reaches Codex unchanged.
- `src/commands/plan.ts:287-294` (planning) and `src/commands/plan.ts:532-544` (amend) show how the prompt builders are called; nothing in either call site changes.
- Edit both files in the same working session so the Step 0 and critique-loop wording stays copy-paste consistent. Diff the two files after editing to confirm the shared blocks match.
