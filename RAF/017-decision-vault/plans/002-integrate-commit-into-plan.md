# Task: Integrate Commit into Plan Command

## Objective
Call the git commit utility after planning completes successfully in both regular and amend modes.

## Context
The commit utility from task 001 needs to be integrated into the plan command. The commit should happen automatically after Claude finishes planning and plan files have been created.

## Dependencies
001

## Requirements
- Commit happens automatically (no flag needed)
- Commit after both regular `raf plan` and `raf plan --amend`
- Only attempt commit if at least one plan file was created
- Warning on failure should not affect the success message shown to user

## Implementation Steps
1. Import `commitPlanningArtifacts` in `src/commands/plan.ts`
2. In `runPlanCommand()`:
   - After the "Planning complete!" success message (around line 199-207)
   - Before the final `logger.info` about running `raf do`
   - Call `await commitPlanningArtifacts(projectPath)`
3. In `runAmendCommand()`:
   - After the "Amendment complete!" success message (around line 376-386)
   - Before the final `logger.info` about running `raf do`
   - Call `await commitPlanningArtifacts(projectPath)`
4. Ensure the commit call is inside the `if (planFiles.length > 0)` block so we only commit when plans exist

## Acceptance Criteria
- [ ] Regular `raf plan` commits input.md and decisions.md after planning
- [ ] `raf plan --amend` commits input.md and decisions.md after amendment
- [ ] No commit attempted if no plan files were created
- [ ] Git warnings displayed but don't interrupt success flow
- [ ] TypeScript compiles without errors

## Notes
- The projectPath variable is already available in both functions
- Keep the logging flow clean - git warning should appear but not overshadow success message
