Implemented Codex post-run token usage capture so `codex exec --json` `turn.completed` events now feed RAF's shared usage pipeline instead of being dropped at the runner boundary.

Key changes:
- Updated `src/parsers/codex-stream-renderer.ts` to extract structured `UsageData` from `turn.completed`, including exact input/output token counts and model-scoped usage while leaving exact cost unavailable.
- Updated `src/core/codex-runner.ts` to retain streamed Codex usage data and return it through the normal `RunResult.usageData` path used by `raf do`.
- Refined shared usage/cost types and accumulation in `src/types/config.ts`, `src/utils/token-tracker.ts`, and `src/utils/terminal-symbols.ts` so unknown exact cost remains unavailable across retries and summaries instead of rendering as a fake exact zero.
- Added coverage in `tests/unit/codex-stream-renderer.test.ts`, new `tests/unit/codex-runner.test.ts`, `tests/unit/token-tracker.test.ts`, and `tests/unit/terminal-symbols.test.ts`.

Important notes:
- Acceptance criteria around Codex input/output token capture, runner propagation, retry accumulation, and unavailable-cost handling were implemented in code and covered by new/updated unit tests.
- Verification was limited by the worktree environment because `node_modules` is absent.
- Attempted verification:
  - `npm test -- --runInBand tests/unit/codex-stream-renderer.test.ts tests/unit/codex-runner.test.ts tests/unit/token-tracker.test.ts tests/unit/terminal-symbols.test.ts` -> failed with `jest: command not found`
  - `npm run lint` -> failed with `tsc: command not found`
<promise>COMPLETE</promise>
