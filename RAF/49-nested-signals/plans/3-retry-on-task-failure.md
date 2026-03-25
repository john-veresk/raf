---
effort: medium
---
# Task: Fix task failure retry logic in `raf do`

## Objective
Make `raf do` properly retry tasks that fail with a `<promise>FAILED</promise>` marker or via outcome file, instead of silently giving up.

## Context
The retry loop in `src/commands/do.ts` (lines 844-976) has three bugs that prevent proper retry on failure:

1. **`isRetryableFailure` in output-parser.ts**: When `parsed.failureReason` is undefined (LLM wrote `<promise>FAILED</promise>` without a reason), the function returns `false`, treating it as non-retryable. This causes a `break` at line 954-955, exiting the retry loop.

2. **No retryability check for outcome-file failures**: When `parsed.result === 'unknown'` and the outcome file says 'failed' (lines 964-966), the failure is recorded but no retryability check is performed. The loop technically continues via the while condition, but there's no explicit retry logic.

3. **Missing explicit `continue` statements**: After recording a retryable failure in the `'failed'` branch (line 956) and the unknown/outcome-file branches, there's no explicit `continue`. While the while loop condition does handle this, adding explicit `continue` statements improves clarity and prevents future bugs if code is added after these blocks.

## Dependencies
2

## Requirements
- Tasks that fail with `<promise>FAILED</promise>` (with or without a reason) must be retried up to `maxRetries`
- Tasks that fail via outcome file must also be retried
- Non-retryable failures (context overflow, "cannot be done", "permission denied", etc.) must still break immediately
- Retry escalation to ceiling model must still work on retries
- The failure history must accurately track all attempts
- Previous outcome file content must be available as retry context (existing behavior via `previousOutcomeFileForRetry`)

## Implementation Steps
1. Read `src/parsers/output-parser.ts` — focus on `isRetryableFailure()` (around line 88-120)
2. Read `src/commands/do.ts` — focus on the retry loop (lines 844-976), specifically the failure handling branches

3. Fix `isRetryableFailure()` in `src/parsers/output-parser.ts`:
   - Current logic: returns `false` when `parsed.result === 'failed'` and `parsed.failureReason` is falsy
   - Fix: failures without a reason should be considered retryable (default to retry). Change the final `return false` to handle the case where `parsed.result === 'failed'` without a reason — this should return `true`
   - Keep the non-retryable pattern checks for failures WITH reasons
   - Keep context overflow as non-retryable

4. Add explicit `continue` in do.ts after retryable failure handling:
   - In the `parsed.result === 'failed'` branch (after line 956): add `continue` so the loop explicitly retries
   - In the outcome-file 'failed' branch (after line 966): add retryability check + `continue`

5. Add retryability check for outcome-file failures in do.ts:
   - After line 966 (`failureReason = 'Task failed (from outcome file)'`), the code should check retryability similarly to the parsed failure case
   - Since outcome file failures don't have parsed failure reasons, they should default to retryable (just `continue`)

6. Verify that the "unknown result with no outcome file" case (line 972) also gets a `continue` for retry

## Acceptance Criteria
- [ ] A task that outputs `<promise>FAILED</promise>` without a reason is retried up to maxRetries
- [ ] A task that outputs `<promise>FAILED</promise>` with a retryable reason is retried
- [ ] A task that outputs `<promise>FAILED</promise>` with "cannot be done" is NOT retried
- [ ] A task where the outcome file indicates failure is retried
- [ ] Context overflow failures are still NOT retried
- [ ] Failure history correctly tracks all retry attempts
- [ ] Retry uses the ceiling model (existing escalation behavior preserved)

## Notes
- The while loop condition `!success && attempts < maxRetries` technically handles retry without explicit `continue`, but explicit `continue` is safer and clearer
- The `previousOutcomeFileForRetry` variable (line 886-888) already passes the previous outcome to the retry prompt, so the LLM gets context about why the previous attempt failed
- Be careful not to retry infinitely — the `maxRetries` guard in the while condition prevents this
- Consider also checking: when `parsed.result === 'unknown'` and no outcome file exists, is it correct to retry? Currently it records failure but doesn't break, so while-loop retries. This seems correct — an unknown result could be a transient issue.
