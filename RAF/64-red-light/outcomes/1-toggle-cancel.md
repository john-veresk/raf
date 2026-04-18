## Summary
Implemented graceful-stop toggle behavior for `raf do` so `C` now arms/disarms pending cancel, including the rate-limit retry boundary. Added an explicit non-failure graceful-stop path so canceling during a rate-limit wait stops before retry without writing a FAILED outcome.

## Key Changes
- Updated `src/utils/keyboard-controller.ts`:
  - `C`/`c` now toggles pending cancel on/off.
  - Added clear log when pending stop is disarmed: `[pending stop cleared]`.
  - Updated hotkey hint to `C = toggle stop`.
- Updated `src/commands/do.ts`:
  - Added `resolvePostRateLimitWaitDecision(...)` helper to model post-wait actions (`retry`, `graceful-stop`, `abort`).
  - In rate-limit flow, check pending cancel immediately after wait completion and skip retry when still armed.
  - Added explicit graceful-stop branch so this path is not treated as failure (no failure analysis/stash/FAILED outcome for that task).
  - Kept shutdown behavior unchanged (`Ctrl+C` still follows existing abort path).
- Updated tests:
  - `tests/unit/keyboard-controller.test.ts` now verifies toggle-on/toggle-off behavior and updated hotkey string.
  - Added `tests/unit/do-rate-limit-cancel.test.ts` for post-rate-limit retry/graceful-stop decision regression coverage.
- Updated docs:
  - `README.md` now documents runtime hotkeys (`Tab`, `P`, `C`) and clarifies graceful-stop semantics, including the rate-limit retry boundary.

## Verification
- `npm run lint` passed.
- `npm test -- --runInBand tests/unit/keyboard-controller.test.ts tests/unit/do-rate-limit-cancel.test.ts` passed.

## Notes
- `package-lock.json` changed due local dependency installation for running tests and is intentionally not included in task commit.

<promise>COMPLETE</promise>
