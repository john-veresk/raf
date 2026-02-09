# Task: Update Execution Prompts with Dependency Context

## Objective
Modify the execution system prompt to include outcome summaries of completed dependency tasks, giving Claude full context when executing dependent tasks.

## Context
When a task depends on other tasks, Claude should know what those tasks accomplished. This helps Claude understand the current state of the codebase and build upon previous work effectively.

## Dependencies
003, 004

## Requirements
- Execution prompt should include dependency task outcomes when relevant
- Show outcome summaries (not full content) to manage context size
- Clearly label which outcomes are from dependencies vs previous tasks
- Only include outcomes for tasks listed in Dependencies section
- Handle case where task has no dependencies (no extra context)

## Implementation Steps
1. Update `src/prompts/execution.ts`:
   - Accept dependency information (list of dependency task IDs)
   - Accept dependency outcomes (map of task ID to outcome content)
   - Add new section to prompt: "## Dependency Context"
2. Create outcome summarizer (if needed):
   - Extract key information from outcome files for context
   - Or include full outcome if reasonably sized
3. Update `src/commands/do.ts` to pass dependency info to execution prompt:
   - Read dependency outcomes from project
   - Pass to prompt builder
4. Format the dependency context section:
   - List each dependency task with its outcome summary
   - Make clear these tasks have already completed successfully

## Acceptance Criteria
- [ ] Execution prompt includes dependency context section when task has dependencies
- [ ] Dependency outcomes clearly labeled by task ID
- [ ] Claude receives useful context about what dependencies accomplished
- [ ] Tasks without dependencies have no extra context section
- [ ] Context size remains reasonable (summarize if needed)

## Notes
- This is about providing context, not validation - blocked tasks are handled in task 004
- Focus on giving Claude actionable information about the state of the project
- Consider truncating very long outcomes to avoid context bloat
