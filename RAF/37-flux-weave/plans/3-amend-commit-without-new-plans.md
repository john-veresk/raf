---
effort: medium
---
# Task: Commit Amended Changes When No New Plans Are Created

## Objective
Fix the amend flow to commit changes even when no new plan files are created, as long as decisions.md, input.md, or existing plan files were updated.

## Context
Currently, `commitPlanningArtifacts()` in the amend flow only commits if new plan files were created. But an amend session might only update decisions.md, modify existing plans, or update input.md without adding new tasks. These changes should still be committed with the 'Amend' format commit message.

## Dependencies
1

## Requirements
- When `raf plan --amend` runs and the Claude session completes, commit if ANY of these changed:
  - `input.md` was updated (new task description appended)
  - `decisions.md` was updated (new Q&A pairs added)
  - Existing plan files in `plans/` were modified
- Use the existing 'Amend' commit message format: `RAF[id] Amend: project-name`
- If truly nothing changed (no file modifications at all), don't create an empty commit

## Implementation Steps

1. **Examine `commitPlanningArtifacts()` in `src/core/git.ts`** (around line 228):
   - Currently it receives a list of new plan files and stages them alongside input.md and decisions.md
   - The issue is likely in how the amend flow in `plan.ts` decides whether to call commit — it may skip the call when no new plan files are detected

2. **Examine the amend flow in `src/commands/plan.ts`** (around line 616-646):
   - After the Claude session, it checks for new plan files (those with ID >= nextTaskNumber)
   - If no new plan files are found, it likely skips the commit step
   - Fix: always attempt to commit after a successful amend session, regardless of whether new plan files were created

3. **Update the commit logic:**
   - Always stage `input.md` and `decisions.md` (they're almost always updated during amend)
   - Stage any modified plan files in the `plans/` directory (use `git diff --name-only` or stage the entire plans directory)
   - Call `commitPlanningArtifacts()` even when the new plan files list is empty
   - The existing `git diff --cached` check before commit will naturally prevent empty commits

4. **Test the flow:**
   - Verify that an amend session that only updates decisions still commits
   - Verify that an amend session with no changes at all doesn't create an empty commit

## Acceptance Criteria
- [ ] `raf plan --amend` commits when decisions.md is updated but no new plans created
- [ ] `raf plan --amend` commits when existing plan files are modified but no new plans created
- [ ] `raf plan --amend` commits when input.md is updated but no new plans created
- [ ] `raf plan --amend` does NOT create an empty commit when nothing changed
- [ ] `raf plan --amend` still commits normally when new plan files ARE created
- [ ] Commit message uses 'Amend' format in all cases

## Notes
- The `commitPlanningArtifacts()` function already has a `git diff --cached` check that prevents empty commits, so the main fix is ensuring the amend flow always calls commit rather than short-circuiting when no new plans are detected.
- This depends on task 01 because project ID format changes may affect how `commitPlanningArtifacts` resolves the project ID for the commit message.
