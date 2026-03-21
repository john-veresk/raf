# Outcome: Codex fast mode research and config handling

## Summary
Verified Codex CLI capabilities and updated RAF to treat `fast` as Claude-only with explicit user-facing warnings for Codex entries.

## Research Findings
- Checked `codex --help` and `codex exec --help` directly.
- No Codex fast mode flag is available in current CLI help output.
- Conclusion: Codex fast mode is unsupported in RAF and should not be applied in Codex runner args.

## Key Changes Made
- `src/utils/config.ts`
  - Added `collectConfigValidationWarnings()` to detect `fast: true` on `harness: "codex"` model entries.
  - Added warning emission during `resolveConfig()` for those entries.
  - Updated model-entry merge normalization to strip `fast` from resolved Codex entries so the unsupported setting is ignored consistently.
- `src/commands/config.ts`
  - Updated `raf config set` flow to emit the same config validation warnings after validation.
- `src/prompts/config-docs.md`
  - Clarified that Codex does not support fast mode and RAF warns/ignores `fast: true` on Codex entries.
- `README.md`
  - Added CLI note that fast mode is Claude-only and Codex `fast` settings are warned/ignored.
- `tests/unit/config.test.ts`
  - Added warning helper coverage for Codex `fast: true` entries.
  - Added resolve-config coverage to verify Codex `fast` is warned and stripped.
  - Removed stale `spark` alias expectations.
- `tests/unit/config-command.test.ts`
  - Added coverage that `raf config set` warns when setting Codex `fast: true`.
- `AGENTS.md`
  - Added agent note documenting Codex fast-mode warning/ignore behavior.

## Verification
- Build passed: `npm run -s build`
- Focused tests passed:
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/config.test.ts tests/unit/config-command.test.ts`

## Notes
- `CodexRunner` was not modified because Codex CLI currently exposes no fast-mode capability to wire.
<promise>COMPLETE</promise>
