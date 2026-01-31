# Task: Define Dependency Syntax in Plan Files

## Objective
Establish the syntax and location for specifying task dependencies in plan markdown files.

## Context
Tasks in RAF can depend on other tasks. When a dependency fails, dependent tasks should be blocked. This task defines how dependencies are expressed in plan files, which is foundational for the entire feature.

## Dependencies
None - this is the foundational task.

## Requirements
- Dependencies use task IDs only (e.g., `001`, `002`) - not full task names
- Add a new `## Dependencies` section after `## Context`, before `## Requirements`
- Section is optional - tasks without dependencies omit it
- Multiple dependencies are comma-separated
- Dependencies must reference task IDs that exist in the same project

## Implementation Steps
1. Update the plan file template in `src/prompts/planning.ts` to include the optional Dependencies section
2. Document the new section format in the plan structure comment/documentation
3. Update the amend prompt in `src/prompts/amend.ts` to show dependencies for existing tasks

## Acceptance Criteria
- [ ] Planning prompt template includes Dependencies section with clear format instructions
- [ ] Amend prompt displays dependencies when showing existing tasks
- [ ] Documentation in CLAUDE.md updated to reflect new plan structure

## Notes
- The Dependencies section is optional - first tasks typically have none
- Format: `## Dependencies\n001, 002` (simple comma-separated list)
- This task only defines syntax; parsing is handled in task 003
