---
effort: medium
---
# Task: Trust Provider Rate-Limit Timestamps Exactly

## Objective
Make RAF display and wait on provider-reported rate-limit reset timestamps exactly, without synthetic safety buffers when a concrete reset time is known.

## Context
The current wait path in `src/core/rate-limit-waiter.ts` adds a 30-second safety buffer to every known reset time and adds another 60 seconds when the reset time is close or already passed. That shifts both the log line and the actual retry point later than the provider-reported `resets_at` timestamp.

For Codex `usage_limit_reached`, the structured parsers already capture `resets_at` and convert it into a `Date`. The user wants RAF to trust that provider timestamp as the source of truth for both display and retry timing.

## Requirements
- When `rateLimitInfo.resetsAt` is present from provider output, log the exact provider-reported reset instant with no added delay.
- Retry as soon as the wall clock reaches that provider-reported timestamp.
- Preserve the existing fallback behavior only for cases where RAF does not have a concrete reset time.
- Keep pause (`P`) and abort (`Ctrl+C`) behavior working during the wait.
- Ensure Codex `usage_limit_reached` continues to flow through the structured detection path unchanged; the change is in waiting/display policy, not in whether the event is recognized.
- Update docs to state that known reset timestamps are honored exactly and fallback wait time applies only when RAF cannot determine one.

## Acceptance Criteria
- [ ] A known `resetsAt` timestamp is displayed without any extra 30s/60s offset.
- [ ] RAF retries at the provider-reported reset timestamp, not after an added safety delay.
- [ ] Unknown-reset fallback still uses `rateLimitWaitDefault`.
- [ ] Pause and abort controls continue to work while waiting.
- [ ] Unit tests lock the exact-timestamp behavior so a future buffer does not reappear accidentally.

## Implementation Steps
1. Refactor `src/core/rate-limit-waiter.ts` so known reset times and unknown-reset fallback use separate timing branches.
2. Remove synthetic buffers from the known-reset branch for both the initial log line and the wait duration.
3. Keep the fallback-duration path for unknown reset times explicit and documented.
4. Add focused unit coverage for the waiter behavior, including:
   exact known-reset display/wait behavior,
   unknown-reset fallback,
   pause/abort compatibility.
5. Update README/help text that describes rate-limit waiting so it matches the exact-timestamp policy.

## Files to Modify
- `src/core/rate-limit-waiter.ts`
- `README.md`
- `tests/unit/rate-limit-waiter.test.ts`

## Risks & Mitigations
- Risk: retrying exactly at the reported timestamp may surface provider clock skew or edge-of-window flakiness.
  Mitigation: keep the unknown-reset fallback path unchanged and add tests that distinguish “known exact timestamp” from “unknown fallback wait”.
- Risk: the code still displays minute-only time while waiting on a second-precision timestamp.
  Mitigation: derive display directly from the unmodified `Date`; do not round by adding offsets.

## Notes
- This task should not re-open the earlier “unknown rate limit type” behavior. Unknown limit types should continue following the existing normal-retry path in `do.ts`.
