# Task 1 Outcome: Codex Execution True Dangerous Mode

## Summary
Implemented configurable Codex execution policy for `raf do`, defaulting to true dangerous mode. Non-interactive Codex task runs now use `--dangerously-bypass-approvals-and-sandbox` by default, with an explicit config fallback to legacy sandboxed `--full-auto`.

## Key Changes
- Added Codex execution policy to config schema and defaults:
  - `src/types/config.ts`
  - New `codex.executionMode` (`"dangerous" | "fullAuto"`) in `RafConfig`
  - Default set in `DEFAULT_CONFIG` to `"dangerous"`
- Updated config validation/merge/accessors:
  - `src/utils/config.ts`
  - Accepts and validates `codex.executionMode`
  - Deep-merges `codex` overrides
  - Added `getCodexExecutionMode()` helper
- Threaded execution mode through runner config for task execution:
  - `src/core/runner-types.ts` (`RunnerConfig.codexExecutionMode`)
  - `src/commands/do.ts` now resolves config mode and passes it to `createRunner(...)` for `raf do`
- Replaced hardcoded Codex exec flag mapping:
  - `src/core/codex-runner.ts`
  - `dangerous` -> `--dangerously-bypass-approvals-and-sandbox`
  - `fullAuto` -> `--full-auto`
  - Preserved `--json`, `--ephemeral`, `-m`, reasoning effort override, timeout, completion detection
  - Interactive `runInteractive()` behavior left unchanged
- Added/updated tests:
  - `tests/unit/codex-runner.test.ts` covers dangerous default and `fullAuto` override arg construction
  - `tests/unit/config.test.ts` covers config validation and merge for `codex.executionMode`
  - `tests/unit/config-command.test.ts` covers `raf config set codex.executionMode ...`
- Updated docs:
  - `README.md`
  - `src/prompts/config-docs.md`
  - Documented new default, risk profile, and fallback mode

## Verification
- `npm run lint` passed.
- Tests passed:
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/codex-runner.test.ts tests/unit/config-command.test.ts -i`
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/config.test.ts -t "codex execution mode|codex.executionMode|codex" -i`

## Notes
- Jest in this environment required `--watchman=false` due local watchman socket permission error.
- Change is scoped to `raf do` execution path via runner config threading; interactive Codex path remains unchanged.

<promise>COMPLETE</promise>
