# Task: Update Git Commit Instructions

## Objective
Modify the task execution prompt to commit only files related to the current task instead of all changes.

## Context
Currently, the execution prompt instructs Claude to use `git add -A`, which stages all changes including unrelated files. This can result in commits containing changes that don't belong to the current task. The fix ensures each task commit is scoped to only its relevant changes.

## Requirements
- Replace `git add -A` with explicit file staging
- Commit must include: code files modified during the task, the outcome file, and the plan file for the current task
- Claude should use its own judgment about which files it modified (no git diff verification needed)
- Remove the misleading comment about "any new plan files in the plans/ folder"

## Implementation Steps
1. Read `src/prompts/execution.ts`
2. Locate the `commitInstructions` section (around lines 89-101)
3. Replace the current git add instruction:
   ```typescript
   // Current (lines 93-95):
   1. Stage all changes with \`git add -A\`
      - This includes any new plan files in the \`plans/\` folder

   // Replace with:
   1. Stage only the files you modified during this task:
      - Add each code file you changed: \`git add <file1> <file2> ...\`
      - Add the outcome file: \`git add ${outcomeFilePath}\`
      - Add this task's plan file: \`git add ${planPath}\`
   ```
4. Ensure the string template variables (`${outcomeFilePath}`, `${planPath}`) are properly interpolated
5. Run tests to verify no regressions

## Acceptance Criteria
- [ ] `git add -A` is no longer used in the execution prompt
- [ ] Instructions clearly tell Claude to add only modified files
- [ ] Outcome file path is explicitly included in staging instructions
- [ ] Plan file path for the current task is explicitly included
- [ ] All existing tests pass

## Notes
- The `planPath` variable is already available in the `getExecutionPrompt` function params
- The `outcomeFilePath` variable is also already available
- This is a prompt text change only - no structural code changes needed
