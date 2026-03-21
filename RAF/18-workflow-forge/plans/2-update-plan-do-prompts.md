# Task: Update Plan and Do Prompts

## Objective
Update the planning prompt to produce high-level output and the execution prompt to mandate Task tool usage for subagent delegation.

## Context
The planning prompt needs to guide Claude to produce high-level, conceptual plans without code snippets or excessive implementation details. The execution prompt needs to instruct Claude to use the Task tool to split work and delegate to subagents for better task management.

## Requirements
- **Plan prompt updates:**
  - Instruct to produce high-level but detailed plans
  - Avoid code snippets and implementation specifics
  - File paths are acceptable when referencing previous plans/outputs or project structure

- **Do prompt updates:**
  - Add mandatory instruction: "Use Task tool to split work and delegate to subagents for task execution"
  - This applies to all task executions, not optional

## Implementation Steps
1. Read the current planning prompt in `src/prompts/planning.ts`
2. Add instructions for high-level output, avoiding code snippets
3. Read the current execution prompt in `src/prompts/execution.ts`
4. Add mandatory Task tool / subagent delegation instruction
5. Ensure prompt changes don't conflict with existing instructions

## Acceptance Criteria
- [ ] Planning prompt instructs high-level output without code snippets
- [ ] Planning prompt allows file paths for project references
- [ ] Execution prompt mandates Task tool usage for subagent delegation
- [ ] Prompts remain clear and well-structured

## Notes
- Prompt files are located in `src/prompts/` directory
- The amend prompt (`amend.ts`) may also need similar updates for consistency
