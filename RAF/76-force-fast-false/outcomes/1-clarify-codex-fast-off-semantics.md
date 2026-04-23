Implemented the planned docs-and-tests hardening pass for Codex fast-mode semantics without changing runtime behavior.

Key changes made:
- Updated `README.md` to state that Codex `fast` is opt-in, `fast: true` adds `-c 'service_tier="fast"'`, and omitted or `false` values send no `service_tier` override.
- Updated `src/prompts/config-docs.md` with the same user-facing semantics for the config reference used by the config workflow.
- Extended `tests/unit/codex-runner.test.ts` to verify both interactive and non-interactive Codex runner paths omit any `service_tier` override when `fast` is missing or explicitly `false`, while preserving the existing `fast: true` assertions.
- Extended `tests/unit/name-generator.test.ts` to verify Codex-backed name generation also omits any `service_tier` override when `fast` is missing or `false`, while preserving the existing `fast: true` assertion.
- Installed local dev dependencies with `npm install` so the targeted Jest suites could run in this worktree.

Verification:
- Ran `NODE_OPTIONS='--experimental-vm-modules' npm exec -- jest --runTestsByPath tests/unit/codex-runner.test.ts tests/unit/name-generator.test.ts`
- Result: 2 test suites passed, 52 tests passed.

## Decision Updates
None. The task preserved the existing runtime behavior and only clarified/documented it while adding regression coverage.

Notes:
- `RAF/76-force-fast-false/context.md` already had unrelated uncommitted changes before this task and was intentionally left untouched.
<promise>COMPLETE</promise>
