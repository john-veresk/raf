Implemented the new `display` config group and formalized `display.statusProjectLimit` as the only supported display setting for this task.

Key changes:
- Added `DisplayConfig` to the config model and set `DEFAULT_CONFIG.display.statusProjectLimit` to `10`.
- Extended config validation, merge logic, resolved defaults, and helper accessors so `raf config get/set` supports `display.statusProjectLimit`, including `0` as the unlimited sentinel.
- Removed stale `display.showCacheTokens` config expectations from config-facing tests and cleaned unrelated stale cache-display assertions from terminal-symbols tests.
- Updated user-facing config docs in `README.md` and `src/prompts/config-docs.md`.

Verification:
- `npm run lint`
- `npm test -- --runInBand tests/unit/config.test.ts tests/unit/config-command.test.ts tests/unit/terminal-symbols.test.ts`

Notes:
- `getStatusProjectLimit()` is now available for follow-on work that wires the display limit into `raf status`.

<promise>COMPLETE</promise>
