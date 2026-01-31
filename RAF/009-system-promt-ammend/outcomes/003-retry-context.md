# Task 003 - Add Previous Outcome Context on Retry

## Summary

Verified and confirmed the retry context functionality that provides Claude with context from previous failed attempts when retrying a task. On retry attempts (2nd and beyond), the execution prompt includes a "Retry Context" section that instructs Claude to read the previous outcome file before starting.

## Implementation Details

### Modified Files

1. **src/prompts/execution.ts**
   - `ExecutionPromptParams` interface includes `attemptNumber?: number` and `previousOutcomeFile?: string` parameters
   - `getExecutionPrompt()` generates a "Retry Context" section when `attemptNumber > 1` and `previousOutcomeFile` exists
   - The retry context section instructs Claude to:
     1. Read the previous outcome file first
     2. Understand what was attempted and why it failed
     3. Account for the previous failure in the approach
     4. Avoid making the same mistakes

2. **src/commands/do.ts**
   - Prompt generation is inside the retry loop to include updated attempt context
   - Uses `fs.existsSync()` to check if outcome file exists before including it in retry context
   - Passes `attemptNumber` and `previousOutcomeFile` to `getExecutionPrompt()` on each attempt

3. **tests/unit/execution-prompt.test.ts**
   - Contains 6 tests for retry context functionality:
     - `should not include retry context on first attempt`
     - `should not include retry context when attemptNumber is not provided`
     - `should include retry context on second attempt with previous outcome file`
     - `should include retry context on third attempt`
     - `should not include retry context on second attempt without previous outcome file`
     - `should instruct to read previous outcome file and avoid same mistakes`

## Acceptance Criteria Status

- [x] On first attempt, no retry context in prompt
- [x] On second attempt, prompt includes retry context section
- [x] Retry context instructs Claude to read the previous outcome file
- [x] Retry context includes the attempt number
- [x] Missing outcome file doesn't break retry (no retry context if file doesn't exist)
- [x] All tests pass (544 tests)

## Technical Notes

The retry context is conditionally generated based on:
- `attemptNumber > 1` (only on retry attempts)
- `previousOutcomeFile` exists (only if there's a previous outcome file to read)

This ensures:
- First attempts have no extra context
- Retries without an outcome file don't reference a non-existent file
- The outcome file path is provided as an absolute path Claude can read directly

<promise>COMPLETE</promise>
