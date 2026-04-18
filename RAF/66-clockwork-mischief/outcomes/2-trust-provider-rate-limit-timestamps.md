Implemented the rate-limit waiter update so RAF now trusts provider-reported reset timestamps exactly instead of adding synthetic 30s/60s buffers when a concrete `resetsAt` value is known. Unknown-reset handling still falls back to the configured default wait duration.

Key changes made:
- Updated `src/core/rate-limit-waiter.ts` to split known-reset and unknown-reset timing into separate branches, remove synthetic buffers from the known-reset path, and keep pause/abort handling intact.
- Updated `src/commands/do.ts` so the waiter now receives either a real provider `resetsAt` value or an explicit fallback duration derived from `rateLimitWaitDefault`.
- Updated `tests/unit/rate-limit-waiter.test.ts` to lock exact known-reset display/wait timing, unknown-reset fallback timing, pause compatibility, and abort behavior.
- Updated `README.md` to document that RAF honors exact provider reset timestamps when available and only uses `rateLimitWaitDefault` when the provider does not supply a reset time.

Important notes:
- Verification passed with `npm test -- tests/unit/rate-limit-waiter.test.ts tests/unit/do-rate-limit-cancel.test.ts` and `npm run lint`.
- Left unrelated existing worktree changes untouched: `package-lock.json` and `RAF/66-clockwork-mischief/decisions.md`.

<promise>COMPLETE</promise>
