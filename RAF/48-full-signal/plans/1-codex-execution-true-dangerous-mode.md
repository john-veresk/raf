---
effort: high
---
# Task: Codex Execution True Dangerous Mode

## Objective
Make `raf do` run Codex in its actual unrestricted mode by default instead of the current `--full-auto` sandboxed mode.

## Context
RAF currently hardcodes `codex exec --full-auto --json --ephemeral` in `src/core/codex-runner.ts` and treats that as the Codex analogue of Claude's dangerous skip-permissions mode. Local Codex CLI help shows that assumption is wrong: `--full-auto` only expands to `-a on-request --sandbox workspace-write`, while the real unrestricted mode is `--dangerously-bypass-approvals-and-sandbox`. The user hit a real failure in `../Bindnotes` where `xcodebuild test` was blocked by sandbox restrictions (`sandbox-exec: sandbox_apply: Operation not permitted`), so RAF needs to expose and use the correct execution mode for Codex task runs.

## Requirements
- Change Codex non-interactive execution in `raf do` to use true dangerous mode by default.
- Keep the behavior configurable in RAF config, per project convention that new features must be added to `DEFAULT_CONFIG` in `src/types/config.ts`.
- Scope the change to execution mode used by `raf do`; do not silently alter interactive Codex behavior unless the code path clearly shares the same execution contract.
- Preserve the rest of the Codex exec invocation shape: `--json`, `--ephemeral`, `-m <model>`, reasoning-effort config, timeout handling, and completion detection.
- Provide an explicit safer fallback mode for users who want the old sandboxed behavior.
- Update README and config docs so the new default and its risk are clear.

## Implementation Steps
1. Extend the config schema in `src/types/config.ts` with an explicit Codex execution policy, defaulting to dangerous mode. Prefer a shape that can grow, for example:
   ```ts
   codex: {
     executionMode: 'dangerous' | 'fullAuto';
   }
   ```
2. Update config validation and resolved-config loading in `src/utils/config.ts` so the new key is accepted, merged with defaults, and surfaced through a helper that `raf do` and runner creation can consume.
3. Thread the selected execution policy through `RunnerConfig` and `createRunner()` so `CodexRunner` can construct flags from config rather than hardcoding `--full-auto`.
4. In `src/core/codex-runner.ts`, replace the fixed exec args with a small policy mapper:
   - `dangerous` -> `--dangerously-bypass-approvals-and-sandbox`
   - `fullAuto` -> `--full-auto`
   Keep `--json --ephemeral -m <model>` and any reasoning-effort overrides unchanged.
5. Verify `runInteractive()` remains unchanged unless there is a deliberate reason to align it; the user asked about execution failures in `raf do`, not planning or interactive Codex sessions.
6. Add or update unit tests in `tests/unit/codex-runner.test.ts`, `tests/unit/config.test.ts`, and any runner-factory/config-command coverage so the selected mode is reflected in spawned Codex args and config parsing.
7. Update `README.md` and any config documentation/prompts that describe Codex execution so they no longer imply `--full-auto` is the dangerous equivalent.

## Acceptance Criteria
- [ ] By default, Codex task execution uses `codex exec --dangerously-bypass-approvals-and-sandbox --json --ephemeral -m <model> ...`.
- [ ] RAF config includes an explicit Codex execution-policy key in `DEFAULT_CONFIG`.
- [ ] Users can opt back into the previous sandboxed Codex mode without code changes.
- [ ] Interactive Codex behavior is unchanged unless intentionally updated and documented.
- [ ] Unit tests cover config parsing and Codex exec arg construction for both modes.
- [ ] `README.md` and config docs describe the new default accurately.

## Notes
The important CLI distinction discovered during investigation is:

- `--full-auto` = `-a on-request --sandbox workspace-write`
- `--dangerously-bypass-approvals-and-sandbox` = true unrestricted execution

This task should not overpromise that every `xcodebuild` problem disappears; external host restrictions can still fail. The goal is to remove Codex's internal sandbox/approval barrier so RAF matches the user's requested execution mode.
