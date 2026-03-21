# Outcome: Update Planning Prompts for Dependency Inference

## Summary

Updated the planning system prompt to instruct Claude to automatically infer and record task dependencies during project planning. The prompt now includes comprehensive guidance on task ordering, dependency identification, and circular dependency prevention.

## Key Changes

### 1. Updated Planning Prompt (`src/prompts/planning.ts`)

**Step 1 Enhancement - Task Ordering:**
- Renamed "Identify Tasks" to "Identify and Order Tasks"
- Added CRITICAL section emphasizing logical execution order
- Provided ordering guidelines: setup → core → integration → testing

**New Step 4 - Dependency Inference:**
- Added dedicated section for inferring task dependencies
- Explained how to identify dependencies:
  - Task B uses output/artifacts from task A
  - Task B modifies code created by task A
  - Task B tests functionality from task A
  - Task B extends or builds upon task A
- Provided format examples for single and multiple dependencies
- Listed rules for proper dependency specification

**Updated Important Rules:**
- Rule 2: Create plans reflecting "logical execution order"
- Rule 5: "Infer dependencies automatically - analyze task relationships, don't ask the user about dependencies"
- Rule 6: "Only add Dependencies section when a task genuinely requires another to complete first"
- Rule 7: "Dependencies must only reference lower-numbered tasks to prevent circular dependencies"

### 2. Updated Test (`tests/unit/planning-prompt.test.ts`)
- Updated test expectation to match new section title "Identify and Order Tasks"

## Files Modified

- `src/prompts/planning.ts` - Planning prompt with dependency inference instructions
- `tests/unit/planning-prompt.test.ts` - Updated test for new section title

## Acceptance Criteria Verification

- [x] Planning prompt includes clear instructions for dependency inference (Step 4)
- [x] Prompt explains to order tasks by logical execution order (Step 1 with CRITICAL guidance)
- [x] Prompt includes example of Dependencies section format (both single and multiple dependencies)
- [x] Prompt warns against circular dependencies (Rule 7 and Step 4 rules)
- [x] Generated plans include appropriate Dependencies sections (template from task 001 + inference instructions)

## Notes

- Dependencies are inferred automatically by Claude during planning, not asked about
- The "only reference lower-numbered tasks" rule structurally prevents circular dependencies
- All 638 tests pass

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 1m 58s
- Completed at: 2026-01-31T16:37:35.541Z
