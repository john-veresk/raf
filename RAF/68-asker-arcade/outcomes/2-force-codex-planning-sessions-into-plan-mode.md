Implemented Codex-specific planning session handling so `raf plan` and `raf plan --amend` now pass an explicit planning intent into the runner layer, and Codex interactive startup uses a verified startup override that enables `request_user_input` for planning interviews.

Key changes made:
- Updated `src/core/runner-types.ts` to carry an `interactiveIntent` for interactive runner calls.
- Updated `src/commands/plan.ts` to pass `interactiveIntent: 'planning'` for new and amend planning sessions only.
- Added an early Codex-specific `raf plan --resume` guard in `src/commands/plan.ts` so users get a clear error before RAF tries to open an unsupported resume flow.
- Updated `src/core/codex-runner.ts` to preflight Codex planning capability via `codex features list` and enable `--enable default_mode_request_user_input` only for planning sessions.
- Added a targeted failure path in `src/core/codex-runner.ts` with an actionable Codex version/error message when the required startup capability is unavailable.
- Expanded `tests/unit/codex-runner.test.ts` and `tests/unit/plan-command-auto-flag.test.ts`, and added `tests/unit/plan-command-codex-resume.test.ts`, to cover the planning override and early resume rejection.
- Updated `README.md` so Codex planning interview behavior and the Codex-only resume limitation are documented.

Important notes:
- Verified the installed CLI is `codex-cli 0.121.0`.
- Verified against the official `rust-v0.121.0` source tag that `Feature::DefaultModeRequestUserInput` exists and is exercised by Codex's own `request_user_input` tests for Default mode.
- Verification run:
  - `npm test -- --runInBand tests/unit/codex-runner.test.ts tests/unit/plan-command-auto-flag.test.ts tests/unit/plan-command-codex-resume.test.ts`
  - `npm run lint`

<promise>COMPLETE</promise>
