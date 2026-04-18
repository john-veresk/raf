Implemented the planning-mode contract change so `raf plan` always runs interactive sessions with permission bypass enabled, regardless of whether the user passes the legacy `-y/--auto` flag.

Key changes made:
- Updated `src/commands/plan.ts` to remove all real control-flow semantics tied to `auto`, keep `-y/--auto` as a hidden compatibility flag, and always pass `dangerouslySkipPermissions: true` for both new-plan and amend flows.
- Updated `src/core/codex-runner.ts` so interactive Codex sessions now honor `RunnerOptions.dangerouslySkipPermissions` by passing `--dangerously-bypass-approvals-and-sandbox`, while leaving non-interactive `codex exec` behavior unchanged.
- Updated runner comments in `src/core/runner-types.ts` and `src/core/claude-runner.ts` to reflect the harness-agnostic interactive dangerous-mode behavior.
- Updated `README.md` to document that planning is already dangerous by default and removed public `-y/--auto` plan references.
- Replaced the old structural `--auto` tests with behavioral compatibility coverage in `tests/unit/plan-command-auto-flag.test.ts`, and added Codex interactive dangerous-mode coverage in `tests/unit/codex-runner.test.ts`.

Verification:
- Installed dependencies with `npm ci` because this worktree did not have `node_modules`.
- Passed `npm test -- --runInBand tests/unit/plan-command-auto-flag.test.ts tests/unit/codex-runner.test.ts`.
- Passed `npm run lint`.

Notes:
- The legacy `-y/--auto` flag is still parsed so old commands keep working, but it no longer changes planning behavior and is hidden from help output.

<promise>COMPLETE</promise>
