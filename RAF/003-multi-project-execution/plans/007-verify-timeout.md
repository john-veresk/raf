# Task: Verify Per-Task Timeout Implementation

## Objective
Verify that the 60-minute timeout is correctly applied per task (not per project or per retry) and add tests to ensure this behavior.

## Context
The user wants to ensure that the timeout (default 60 minutes) is applied to each individual task execution, not shared across tasks or accumulated across retries. Based on code review, the current implementation appears correct, but verification and tests are needed.

## Requirements
- Verify timeout is passed to each Claude execution independently
- Verify timeout resets for each task
- Verify timeout resets for each retry attempt
- Document the timeout behavior clearly
- Add tests to prevent regression

## Implementation Steps

1. **Code review and verification**
   - Review `src/core/claude-runner.ts` timeout handling
   - Trace timeout parameter flow from CLI through to process execution
   - Confirm `setTimeout` is set up per execution
   - Document findings

2. **Verify retry behavior**
   - Check if retries use the same timeout or share elapsed time
   - Current expectation: each retry gets fresh timeout
   - Document actual behavior

3. **Add unit tests for timeout** (`src/core/claude-runner.test.ts`)
   - Test that timeout is passed correctly to spawn
   - Test that timeout handler kills process
   - Test that timedOut flag is set correctly

4. **Add integration tests**
   - Test that multiple tasks each get their own timeout
   - Test that retry attempts get fresh timeout
   - Use mock/stub Claude process for testing

5. **Update documentation**
   - Add comment in code explaining timeout is per-task
   - Update README or help text if needed
   - Add note about retry timeout behavior

6. **Consider edge cases**
   - What happens if timeout is 0? (should be rejected or infinite?)
   - What happens with very large timeout values?
   - Ensure timeout parameter validation

## Acceptance Criteria
- [ ] Code review confirms timeout is per-task execution
- [ ] Code review confirms retries get fresh timeout
- [ ] Unit tests verify timeout behavior
- [ ] Integration tests verify multi-task timeout independence
- [ ] Documentation updated with timeout behavior
- [ ] Edge cases handled appropriately

## Notes
- This is primarily a verification and testing task, not implementation
- If issues are found, they should be fixed as part of this task
- Current implementation in claude-runner.ts appears correct based on exploration:
  - `setTimeout(() => proc.kill('SIGTERM'), timeoutMs)` is set per call
  - Each task execution is a separate call to `run()` or `runVerbose()`
- Timeout includes all time Claude is running, including any context it builds
