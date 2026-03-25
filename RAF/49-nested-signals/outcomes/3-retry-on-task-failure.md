# Outcome: Fix task failure retry logic in `raf do`

## Summary

Fixed three bugs in the retry loop that prevented proper retry of failed tasks.

## Key Changes

- **`src/parsers/output-parser.ts`**: Fixed `isRetryableFailure()` to treat all `failed` results as retryable by default (with or without a reason), unless the reason matches a non-retryable pattern. Previously, a failed result without a `failureReason` fell through to `return false`.

- **`src/commands/do.ts`**: Added explicit `continue` statements in the retry loop after recording retryable failures:
  - After the `parsed.result === 'failed'` retryable branch (line 958)
  - After outcome-file `'failed'` detection (line 969)
  - After "no completion marker in output or outcome file" (line 973)
  - After "no completion marker found" with no outcome file (line 978)

## Verified Acceptance Criteria

- A task that outputs `<promise>FAILED</promise>` without a reason is retried (isRetryableFailure returns true for failed without reason)
- A task with a retryable failure reason is retried (non-retryable pattern check passes, returns true)
- A task with "cannot be done" is NOT retried (non-retryable pattern match returns false, causes break)
- Outcome file failures are retried (continue added)
- Context overflow is still NOT retried (contextOverflow check returns false, causes break)
- Failure history tracks all attempts (push to failureHistory before continue/break in all branches)
- Retry escalation preserved (resolveTaskModel with isRetry flag unchanged)

<promise>COMPLETE</promise>
