Implemented the Codex name-generation fix so partial-but-usable model output is preserved instead of collapsing to the extracted-input fallback.

Key changes:
- Updated `src/utils/name-generator.ts` to use provider-specific CLI invocation for name generation:
  - Claude keeps the existing `--model --no-session-persistence -p` flow.
  - Codex now uses `codex exec --skip-git-repo-check --ephemeral --color never -m <model> <prompt>`.
- Relaxed `generateProjectNames()` so any non-empty sanitized suggestion list is returned, which allows 1-2 valid Codex names to reach the picker / auto-select flow.
- Kept extracted-word fallback behavior for genuine failure cases only, including CLI failure and outputs that sanitize down to zero usable names.
- Added focused regression coverage in `tests/unit/name-generator.test.ts` for Codex invocation, Codex partial-result retention, and Codex no-usable-output fallback.

Verification:
- `npm test -- --watchman=false --runInBand tests/unit/name-generator.test.ts`
- `npm run lint`
- `npm test -- --watchman=false --runInBand`

Notes:
- Claude-backed name generation behavior remains unchanged apart from sharing the same provider-aware helper.
<promise>COMPLETE</promise>
