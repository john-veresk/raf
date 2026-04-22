Updated RAF's user-facing config docs and regression coverage so Codex `fast` mode is documented as an optional, Codex-only `ModelEntry` field and the shipped formatter expectations now match the runtime behavior.

Key changes:
- Updated `README.md` to document the `ModelEntry` shape, note that `fast` is omitted by default, reject it for Claude entries, and describe RAF's Codex fast-mode wiring including the interactive `codex -c 'service_tier="fast"' ...` shape.
- Updated `src/prompts/config-docs.md` to include `fast` in the documented `ModelEntry` schema and show a Codex fast configuration example.
- Reconciled the stale compact-output regression in `tests/unit/command-output.test.ts` so the asserted compact display uses the supported Codex form `(gpt-5.4, medium, fast)` instead of implying Claude accepts `fast`.

Verification:
- `npm test -- tests/unit/codex-runner.test.ts tests/unit/name-generator.test.ts tests/unit/do-model-display.test.ts tests/unit/terminal-symbols.test.ts tests/unit/command-output.test.ts tests/unit/config.test.ts tests/unit/config-command.test.ts`
- `npm run lint`

Notes:
- Existing runner, name-generation, config-validation, and display tests already covered the main `fast` wiring from prior tasks; this task aligned the documentation and removed the remaining stale expectation.
<promise>COMPLETE</promise>
