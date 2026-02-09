# Task: Update Planning Prompts for Dependency Inference

## Objective
Modify the planning system prompt so Claude automatically infers and records task dependencies during project planning.

## Context
When Claude breaks down a project into tasks, it should analyze relationships between tasks and specify dependencies. This enables the execution engine to properly handle task failures by blocking dependent tasks.

## Dependencies
001

## Requirements
- Claude should automatically infer dependencies from task relationships (not ask user)
- Tasks must be ordered in suggested execution order (lower numbers first)
- Circular dependencies must be avoided through proper task ordering
- Dependencies section added to each plan file that has dependencies
- Planning prompt must instruct Claude on dependency inference logic

## Implementation Steps
1. Update `src/prompts/planning.ts` system prompt with dependency inference instructions:
   - Explain what dependencies are and why they matter
   - Instruct Claude to order tasks by execution order
   - Instruct Claude to add Dependencies section listing prerequisite task IDs
   - Warn against circular dependencies
2. Update the plan file template to show Dependencies section format
3. Add examples of proper dependency specification to the prompt

## Acceptance Criteria
- [ ] Planning prompt includes clear instructions for dependency inference
- [ ] Prompt explains to order tasks by logical execution order
- [ ] Prompt includes example of Dependencies section format
- [ ] Prompt warns against circular dependencies
- [ ] Generated plans include appropriate Dependencies sections

## Notes
- Dependencies are inferred, not asked about - this keeps planning efficient
- Claude should use its judgment about what tasks require others to complete first
- Common patterns: setup before implementation, implementation before testing, core before extensions
