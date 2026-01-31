# Task: Add Previous Outcome Context on Retry

## Objective
When retrying a task, provide Claude with context from the previous attempt by instructing it to read the outcome file.

## Context
When a task fails and is retried, Claude starts fresh without knowledge of what went wrong. By providing the path to the previous outcome file and instructing Claude to read it, we give Claude valuable context about:
- What was attempted
- Why it failed
- What to avoid or do differently

This should improve retry success rates.

## Requirements
- On retry attempts (2nd attempt and beyond), add retry context to the prompt
- Instruct Claude to read the previous outcome file before starting
- Include the attempt number in the context
- Do not embed the outcome content directly - just provide the path
- Applies to both failed tasks and interrupted tasks with partial outcomes

## Implementation Steps

1. **Update `ExecutionPromptParams`** in `src/prompts/execution.ts`:
   - Add `attemptNumber: number` parameter
   - Add `previousOutcomeFile?: string` parameter (path to outcome file if exists)

2. **Update `getExecutionPrompt()`** in `src/prompts/execution.ts`:
   - If `attemptNumber > 1` and `previousOutcomeFile` exists, add a retry context section
   - Section should say something like:
     ```
     ## Retry Context

     This is attempt ${attemptNumber} at executing this task. The previous attempt
     produced an outcome file that you should review before starting.

     **Previous outcome file**: ${previousOutcomeFile}

     Please:
     1. Read the previous outcome file first
     2. Understand what was attempted and why it failed
     3. Account for the previous failure in your approach
     4. Avoid making the same mistakes
     ```

3. **Update `do.ts`** to track and pass attempt info:
   - Track `attempts` counter (already exists)
   - Check if outcome file exists before retry
   - Pass `attemptNumber` and `previousOutcomeFile` to `getExecutionPrompt()`

4. **Update `getOutcomeFilePath()` usage**:
   - The outcome file path is already computed as `outcomeFilePath`
   - Check if this file exists before including it in retry context

5. **Handle edge cases**:
   - First attempt: no retry context
   - Retry but no outcome file: don't include previous outcome path
   - Outcome file exists: include it even if partial

6. **Add tests**:
   - Test prompt includes retry context on attempt 2+
   - Test prompt excludes retry context on attempt 1
   - Test prompt handles missing outcome file gracefully

## Acceptance Criteria
- [ ] On first attempt, no retry context in prompt
- [ ] On second attempt, prompt includes retry context section
- [ ] Retry context instructs Claude to read the previous outcome file
- [ ] Retry context includes the attempt number
- [ ] Missing outcome file doesn't break retry
- [ ] All tests pass

## Notes
- The outcome file may contain partial work even if the task "failed"
- Claude should be able to use this to avoid duplicate work
- Keep the retry context section concise but informative
- The outcome file path is an absolute path that Claude can read directly
