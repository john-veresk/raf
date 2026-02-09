# Task: Create Git Commit Utility for Planning Artifacts

## Objective
Create a utility function that commits input.md and decisions.md files after planning completes.

## Context
RAF currently commits code changes during task execution, but planning artifacts (input.md and decisions.md) are not committed. This task creates a reusable utility to commit these files with a consistent commit message format.

## Requirements
- Commit only `input.md` and `decisions.md` from the project folder (not plans/)
- Use commit message format: `RAF[NNN] Plan: project-name`
  - NNN is the 3-digit project number (e.g., 017)
  - project-name is the kebab-case project name (e.g., decision-vault)
- If git commit fails (not in repo, nothing to commit, etc.), log a warning and continue
- Never fail the planning session due to git issues

## Implementation Steps
1. Create a new file `src/utils/git.ts` (or add to existing git utilities if present)
2. Implement `commitPlanningArtifacts(projectPath: string): Promise<void>` function:
   - Extract project number and name from projectPath
   - Build the commit message: `RAF[NNN] Plan: project-name`
   - Run `git add` for only `input.md` and `decisions.md` (use explicit paths)
   - Run `git commit -m "message"`
   - Catch any errors and log warning (don't throw)
3. Export the function for use in plan command

## Acceptance Criteria
- [ ] Function `commitPlanningArtifacts` exists in `src/utils/git.ts`
- [ ] Function stages only input.md and decisions.md
- [ ] Commit message follows format `RAF[NNN] Plan: project-name`
- [ ] Git failures result in warning log, not thrown error
- [ ] Function handles "nothing to commit" gracefully
- [ ] TypeScript compiles without errors

## Notes
- Look at existing git usage in the codebase for patterns (execution prompt uses git for task commits)
- Use `child_process.exec` or similar for git commands
- The function should be idempotent - calling it when files are already committed should just warn
