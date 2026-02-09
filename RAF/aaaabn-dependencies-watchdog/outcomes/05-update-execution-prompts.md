# Outcome: Update Execution Prompts with Dependency Context

## Summary

Updated the execution system prompt to include outcome summaries of completed dependency tasks, providing Claude with full context when executing tasks that depend on other tasks. This enables Claude to understand and build upon previous work effectively.

## Key Changes

### 1. Added `summarizeOutcome()` function (`src/prompts/execution.ts`)

Created a helper function to manage context size for dependency outcomes:
- Returns content as-is if under 4000 characters
- Extracts just the Summary section for longer outcomes
- Falls back to truncation at a reasonable break point (newline or period)
- Appends "[Outcome truncated for context size]" indicator when truncated

### 2. Extended `ExecutionPromptParams` interface (`src/prompts/execution.ts`)

Added two new optional parameters:
- `dependencyIds?: string[]` - Task IDs that this task depends on
- `dependencyOutcomes?: Array<{ taskId: string; content: string }>` - Outcomes of dependency tasks

### 3. Updated `getExecutionPrompt()` function (`src/prompts/execution.ts`)

Added generation of "## Dependency Context" section:
- Only included when task has both dependencies AND dependency outcomes
- Lists all dependency IDs
- Shows each dependency outcome with task ID header
- Explains purpose: "Review their outcomes to understand what was accomplished and build upon their work"
- Placed before the existing "Previous Task Outcomes" section

### 4. Updated `do.ts` to pass dependency info (`src/commands/do.ts`)

- Extracts `dependencyIds` from the current task's `dependencies` array
- Filters `previousOutcomes` to get only outcomes for dependency tasks
- Passes both `dependencyIds` and `dependencyOutcomes` to the execution prompt

### 5. Added comprehensive tests (`tests/unit/execution-prompt.test.ts`)

Added 11 new tests covering:
- No dependency context when task has no dependencies
- No dependency context when dependencyIds is empty
- No dependency context when dependencyOutcomes is empty
- Dependency context included with proper formatting
- Multiple dependency outcomes
- Purpose explanation text
- Correct ordering (dependency context before previous outcomes)
- `summarizeOutcome` function behavior (4 tests)

## Files Modified

- `src/prompts/execution.ts` - Added summarizeOutcome function, extended params, added dependency context section
- `src/commands/do.ts` - Pass dependency info to execution prompt
- `tests/unit/execution-prompt.test.ts` - Added 11 new tests

## Acceptance Criteria Verification

- [x] Execution prompt includes dependency context section when task has dependencies
- [x] Dependency outcomes clearly labeled by task ID (e.g., "### Task 001")
- [x] Claude receives useful context about what dependencies accomplished
- [x] Tasks without dependencies have no extra context section
- [x] Context size remains reasonable (summarize if needed) - MAX_DEPENDENCY_OUTCOME_CHARS = 4000

## Test Results

- All 688 tests pass
- 11 new tests added for dependency context functionality

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 3m 47s
- Completed at: 2026-01-31T16:50:33.800Z
