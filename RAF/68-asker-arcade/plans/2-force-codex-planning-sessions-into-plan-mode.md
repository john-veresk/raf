---
effort: high
---
# Task: Force Codex Planning Sessions into Plan Mode

## Objective
Guarantee that `raf plan` and `raf plan --amend` launch Codex in a mode where `request_user_input` is actually available, without adding a RAF config switch.

## Requirements
- Trace the interactive planning lifecycle from `createPlanCommand()` through `createRunner()` into `CodexRunner.runInteractive()`.
- Introduce an explicit planning-session signal in runner inputs so Codex-only startup behavior is driven by command intent rather than string-matching prompt text.
- Use an officially supported Codex CLI mechanism available in the target CLI version to start in `Plan` mode or an equivalent mode where `request_user_input` is enabled.
- Verify the mechanism against the installed Codex CLI version used for development, not just against remembered behavior.
- If no supported startup mechanism exists, fail fast with a clear Codex-specific error instead of silently starting a Default-mode session that cannot fulfill the prompt contract.
- Keep the behavior hardcoded for planning/amend sessions even though RAF usually prefers new config knobs.
- Leave `raf do`, config wizard flows, and Codex non-interactive `exec` behavior unchanged.
- Handle `raf plan --resume` with Codex early and explicitly so users do not hit an opaque runner exception after startup.

## Acceptance Criteria
- [ ] Planning and amend sessions pass an explicit planning intent into the runner layer.
- [ ] Codex interactive startup path applies the verified Plan-mode enabling mechanism for planning/amend only.
- [ ] If the mechanism is unavailable in the tested CLI version, RAF exits with a clear actionable error before opening a broken session.
- [ ] `raf plan --resume` with Codex harness reports the unsupported path immediately.
- [ ] Unit tests cover the new Codex runner arguments or overrides and the plan-command behavior that triggers them.

## Context
The current Codex path in `src/core/codex-runner.ts` simply runs `codex -m <model> <combined_prompt>`. Official Codex sources show that `request_user_input` is guaranteed in `Plan` mode but not in `Default` mode. Prompt-only changes are therefore insufficient.

## Dependencies
- 1

## Implementation Steps
1. Add a runner-level representation of interactive session purpose, for example a `collaborationMode` or `interactiveIntent` field on `RunnerOptions` or `RunnerConfig`.
2. Thread that signal from the planning and amend command paths only.
3. Implement the Codex startup behavior behind that signal.
4. Add a version-checked manual proof path during development so the chosen mechanism is validated against the installed CLI.
5. Add an early Codex-specific guard for unsupported resume.

## Files to Modify
- `src/commands/plan.ts`
- `src/core/runner-types.ts`
- `src/core/codex-runner.ts`
- `src/core/runner-interface.ts` if the signature needs widening
- `tests/unit/codex-runner.test.ts`
- `tests/unit/plan-command*.test.ts`

## Risks & Mitigations
- Risk: current public Codex CLI may not expose a stable startup flag for Plan mode.
- Mitigation: prove the mechanism on the installed version before locking the implementation; otherwise stop with a targeted error instead of shipping a false guarantee.
- Risk: planning-specific startup leaks into `raf do` or other Codex sessions.
- Mitigation: key the behavior off an explicit planning intent and add negative tests for non-planning runs.

## Notes
A prompt-level request is not sufficient here. The executor should treat "Codex planning mode enabled" as a runtime capability that must be demonstrated, not assumed.
