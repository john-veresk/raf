---
effort: low
---
# Task: Show Name Picker Even with -y Flag

## Objective
When `raf plan -y` is used without a project name argument, show the interactive name picker instead of auto-selecting the first generated name.

## Context
The `-y` flag enables dangerous/auto mode which skips Claude permission prompts during planning. Currently it also auto-selects the first generated project name (lines 180-184 in `plan.ts`). The user wants `-y` to only control permission skipping — the name picker should always appear when no name is provided, so the user can run in dangerous mode while still choosing the project name.

## Requirements
- When `autoMode` is true and no `projectName` argument provided: show the full name picker UI (generated suggestions + custom option)
- When `autoMode` is true and `projectName` argument IS provided: use it directly (existing behavior, no change)
- The `-y` flag should still control `dangerouslySkipPermissions` for the Claude runner

## Implementation Steps

1. **`src/commands/plan.ts`** — modify the name selection block (lines 180-184):

   Remove the auto-mode branch that skips the picker:
   ```typescript
   // Before:
   if (autoMode) {
     finalProjectName = suggestedNames[0] ?? 'project';
     logger.info(`Auto-selected project name: ${finalProjectName}`);
   } else {
     finalProjectName = await pickProjectName(suggestedNames);
   }

   // After:
   finalProjectName = await pickProjectName(suggestedNames);
   ```

   Simply always call `pickProjectName()` when no name was provided as argument.

## Acceptance Criteria
- [ ] `raf plan -y` (no name arg) shows the interactive name picker
- [ ] `raf plan -y my-project` (name provided) uses "my-project" directly without picker
- [ ] After name selection, `-y` still enables `dangerouslySkipPermissions` for the Claude session
- [ ] TypeScript compiles without errors
