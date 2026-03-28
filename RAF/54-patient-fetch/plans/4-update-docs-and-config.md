---
effort: low
---
# Task: Update README and Config Docs for Rate Limit Handling

## Objective
Document the new rate limit pause & auto-resume behavior in README.md and ensure the new config key is documented.

## Dependencies
2

## Requirements
- Document `rateLimitWaitDefault` config key in README.md
- Document the rate limit behavior: what happens when a limit is hit, the countdown display, and auto-resume
- Add the config key to any config documentation tables/sections

## Implementation Steps

1. **Read `README.md`** and find the configuration section and the feature list.

2. **Add a section** about rate limit handling behavior. Keep it brief:
   - RAF detects daily/hourly quota limits from both Claude Code and Codex
   - Pauses with a countdown timer showing time until reset
   - Automatically resumes and retries the task when the limit resets
   - Configurable fallback wait time via `rateLimitWaitDefault`

3. **Add `rateLimitWaitDefault`** to the config key documentation:
   - Key: `rateLimitWaitDefault`
   - Type: `number` (minutes)
   - Default: `60`
   - Description: Default wait time when rate limit reset time cannot be determined

4. **Update any existing mentions** of rate limits in the README (e.g., if there are failure type descriptions) to reflect that rate limits are now auto-waited rather than terminal failures.

## Acceptance Criteria
- [ ] README.md documents the rate limit pause & resume behavior
- [ ] `rateLimitWaitDefault` config key is documented with type, default, and description
- [ ] No stale references to rate limits being non-retryable failures

## Notes
- Keep the documentation concise — match the existing README style.
- CLAUDE.md says "Keep README.md updated when adding/changing CLI commands, flags, or features".
