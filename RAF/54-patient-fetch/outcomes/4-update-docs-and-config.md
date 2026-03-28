# Outcome: Update README for Rate Limit Handling

## Summary
Updated README.md to document the rate limit pause & auto-resume behavior introduced in Tasks 1–2.

## Key Changes

### `README.md`
- Added "Rate Limit Auto-Resume" bullet to the Features list
- Added a note under `raf do` explaining the countdown display, auto-resume behavior, and that rate limit waits don't count against `maxRetries`
- Added `rateLimitWaitDefault` (type: `number` minutes, default: `60`) to the example config JSON

## Acceptance Criteria
- [x] README.md documents the rate limit pause & resume behavior
- [x] `rateLimitWaitDefault` config key is documented with type, default, and description
- [x] No stale references to rate limits being non-retryable failures (there were none to remove)

<promise>COMPLETE</promise>
