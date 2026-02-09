# Outcome: Amend Iteration References

## Summary
Enhanced the amend planning prompt to include outcome file paths for completed tasks and instruct Claude to reference previous task outcomes when creating follow-up/fix plans.

## Changes Made

### `src/prompts/amend.ts`
- **Enhanced `existingTasksSummary`**: Completed tasks now include an `Outcome:` line with the full path to their outcome file (e.g., `Outcome: /project/outcomes/001-setup.md`). Non-completed tasks are unaffected.
- **Added follow-up task instructions**: New "Identifying Follow-up Tasks" paragraph in Step 2 instructs Claude to reference previous task outcomes in the Context section when creating follow-up, fix, or iteration tasks. Includes the exact format to use.
- **Updated plan template**: Added a placeholder line in the Context section showing the follow-up reference format.

### `tests/unit/plan-command.test.ts`
- Added 3 new tests:
  - Verifies outcome file paths appear for completed tasks in the task summary
  - Verifies outcome file paths do NOT appear for pending/failed tasks
  - Verifies follow-up task instructions are present in the system prompt

## Acceptance Criteria
- [x] Amend prompt includes outcome file paths for completed tasks in the task summary
- [x] Prompt instructs Claude to identify follow-up/fix tasks and reference outcomes in Context section
- [x] Existing amend functionality is not broken (all 40 plan-command tests pass)
- [x] All tests pass (1 pre-existing failure in planning-prompt.test.ts is unrelated)

<promise>COMPLETE</promise>
