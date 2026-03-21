# Task: Auto-pick project name with -y flag

## Objective
When `raf plan -y` is run without a project name, automatically pick the first generated name instead of prompting the user.

## Context
The `-y`/`--auto` flag currently only skips Claude's permission prompts for file operations. Users want it to also skip the interactive name picker when no project name is explicitly provided, making the planning flow fully automated.

## Requirements
- When `-y`/`--auto` flag is set AND no project name is provided:
  - Generate name suggestions using the existing `generateProjectNames()` function
  - Automatically select the first name from the list (no user interaction)
  - Log which name was auto-selected
- When `-y` flag is NOT set OR a project name IS provided:
  - Behavior remains unchanged (use existing logic)
- User feedback should be provided about the auto-selected name

## Implementation Steps
1. Read `src/commands/plan.ts` to understand the current flow
2. In `runPlanCommand()` (around lines 122-129), modify the name generation logic:
   - Check if `autoMode` is true AND no `projectName` was provided
   - If so, generate names with `generateProjectNames()` and take the first one
   - Log the auto-selected name (e.g., "Auto-selected project name: xyz")
   - Skip the call to `pickProjectName()` in this case
3. Add a test case for auto-name selection in the plan command tests

## Acceptance Criteria
- [ ] `raf plan -y` (no project name) auto-selects the first generated name
- [ ] `raf plan my-project -y` uses the provided name (unchanged behavior)
- [ ] `raf plan` (no -y flag) still shows the interactive picker
- [ ] Auto-selected name is logged to inform the user
- [ ] All existing tests pass
- [ ] New test covers the auto-select behavior

## Notes
- The `generateProjectNames()` function returns 3-5 names; we just need the first one
- Fallback behavior already exists in `generateProjectNames()` if Claude fails
- File: `src/commands/plan.ts`, function: `runPlanCommand()`
