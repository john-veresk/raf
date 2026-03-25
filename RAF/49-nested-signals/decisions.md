# Project Decisions

## For `config set` nested field support — should we support arbitrary depth dot-path resolution or only ModelEntry-specific handling?
Generic dot-path resolution — any valid dot-path into DEFAULT_CONFIG works automatically, handling ModelEntry fields, effortMapping sub-fields, codex sub-fields, etc. Future config additions just work.

## When setting a sub-field like `models.execute.reasoningEffort`, should it merge with existing values or require the full ModelEntry to already exist?
Merge with defaults — if user config has no models.execute entry yet, start from DEFAULT_CONFIG's value and overlay the sub-field change. User only needs to specify what they're changing.

## Where is the missing space between status line and error message?
Investigated: `logger.warn('Context overflow detected')` fires from inside the runner (codex-runner.ts:267, claude-runner.ts:380) while the status line is still active on stdout via `\r`. The warning text appears concatenated with the status line. Fix should clear the status line before printing warnings, or have the logger handle it.

## What are the retry issues for failed tasks?
Three issues found, all should be fixed:
1. `isRetryableFailure` returns false when `parsed.failureReason` is undefined (FAILED without reason = not retryable — wrong).
2. When outcome file says 'failed', no retryability check is done — it falls through and exits.
3. The loop structure technically retries via while condition, but adding explicit `continue` improves clarity.

## How should the Codex timeout issue be fixed?
Investigate + full fix. Add SIGKILL fallback after grace period, investigate whether SIGTERM is insufficient (process might ignore it or spawn children that survive). The task ran 1h28m on a 60min limit.
