Verified the existing config command test coverage against the refactored config API and confirmed it already matches the planned subcommand-based surface.

Key points:
- `tests/unit/config-command.test.ts` already asserts `raf config` subcommand registration for `get`, `set`, `reset`, `wizard`, and nested `preset`.
- The suite already verifies that root-level `--get`, `--set`, and `--reset` behavior is gone and that top-level `raf preset` is not registered.
- Existing messaging assertions already cover the updated `raf config wizard`, `raf config reset`, and `raf config preset ...` guidance.

Verification:
- `npm test -- --watchman=false --runInBand tests/unit/config-command.test.ts`
- `npm run lint`

Notes:
- No additional code changes were required in this task because the dependency work had already aligned the existing test suite with the new config API.
<promise>COMPLETE</promise>
