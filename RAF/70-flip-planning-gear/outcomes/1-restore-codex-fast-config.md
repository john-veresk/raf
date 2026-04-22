Implemented the Codex-only `fast` config surface on shared model entries and wired it through schema validation, deep merge behavior, and config command coverage.

Key changes:
- Updated `src/types/config.ts` so `ModelEntry` includes optional `fast?: boolean`, while `DEFAULT_CONFIG` continues to omit `fast` from concrete model entries.
- Updated `src/utils/config.ts` so config validation accepts `fast` only for `harness: "codex"` entries, rejects Claude usage with a clear error, and preserves `fast` during model-entry deep merges.
- Added unit coverage in `tests/unit/config.test.ts` and `tests/unit/config-command.test.ts` for validation, merge semantics, and `raf config set` nested-path handling of `models.*.fast` and `effortMapping.*.fast`.

Verification:
- `npm test -- tests/unit/config.test.ts`
- `npm test -- tests/unit/config-command.test.ts`
- `npm run lint`

Notes:
- Installed local npm dependencies in the worktree to run the requested verification; no tracked dependency manifest changes were required.
<promise>COMPLETE</promise>
