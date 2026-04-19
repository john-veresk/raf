Updated the planning-facing documentation and UX verification so RAF now documents harness-specific planning behavior without implying that planning always runs through Claude.

Key changes made:
- Updated `README.md` to describe the split explicitly: Claude planning follow-up questions use `AskUserQuestion`, while Codex planning runs in the Codex planning UI via `request_user_input` enabled by `default_mode_request_user_input`.
- Kept the Codex `raf plan --resume` limitation documented in the main command docs, harness configuration section, and command reference.
- Updated `src/commands/plan.ts` so planning and amend logs are harness-neutral: they now describe follow-up questions generically instead of saying the planner will "interview" the user.
- Added a concrete implementation note in `src/core/codex-runner.ts` recording the verified Codex CLI mechanism and version (`codex-cli 0.121.0`).
- Extended `tests/unit/plan-command-auto-flag.test.ts` to cover the UX-sensitive planning/amend log messages alongside the existing Codex planning-mode and resume-guard tests.

Verification:
- `npm test -- --runInBand tests/unit/codex-runner.test.ts tests/unit/plan-command-auto-flag.test.ts tests/unit/plan-command-codex-resume.test.ts`
- `npm run lint`

Important notes:
- The checked assumption left in code is that Codex planning support depends on `codex features list` advertising `default_mode_request_user_input`, and on Codex honoring `--enable default_mode_request_user_input` at startup.

<promise>COMPLETE</promise>
