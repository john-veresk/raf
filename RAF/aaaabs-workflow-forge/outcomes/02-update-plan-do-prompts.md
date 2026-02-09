# Outcome: Update Plan and Do Prompts

## Summary

Updated the planning prompt to produce high-level, conceptual output and the execution prompt to mandate Task tool usage for subagent delegation.

## Changes Made

### Files Modified

1. **src/prompts/planning.ts**
   - Added "Plan Output Style" section with instructions for high-level output
   - Explicitly prohibits code snippets and implementation details
   - Allows file paths for project references (existing files, previous plans/outcomes, directories)
   - Emphasizes describing WHAT needs to be done, not HOW to code it

2. **src/prompts/execution.ts**
   - Added mandatory Task tool instruction as first bullet point in Step 2
   - Specifies agent types: Explore for codebase investigation, Plan for design decisions, general-purpose for implementation
   - Instruction: "Use the Task tool to delegate work to subagents"

3. **src/prompts/amend.ts**
   - Added same "Plan Output Style" section as planning.ts for consistency
   - Amendment mode now produces the same high-level output style as regular planning

## New Prompt Content

### Planning/Amend Prompt Addition
```
## Plan Output Style

**CRITICAL**: Plans should be HIGH-LEVEL and CONCEPTUAL:
- Describe WHAT needs to be done, not HOW to code it
- Focus on architecture, data flow, and component interactions
- NO code snippets or implementation details in plans
- File paths ARE acceptable when referencing:
  - Existing project files to modify
  - Previous plan/outcome files for context
  - Project structure and directories
- Let the executing agent decide implementation specifics
- Plans guide the work; they don't prescribe exact code
```

### Execution Prompt Addition
```
- **Use the Task tool to delegate work to subagents** - Split complex work into subtasks and use specialized agents (Explore for codebase investigation, Plan for design decisions, general-purpose for implementation)
```

## Acceptance Criteria

- [x] Planning prompt instructs high-level output without code snippets
- [x] Planning prompt allows file paths for project references
- [x] Execution prompt mandates Task tool usage for subagent delegation
- [x] Prompts remain clear and well-structured
- [x] Amend prompt updated for consistency

## Test Results

- Build succeeds with no TypeScript errors
- All 747 tests pass

<promise>COMPLETE</promise>
