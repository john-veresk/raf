# Outcome

Implemented the `raf status --all` override and replaced the hardcoded plain-text main-project truncation with the resolved `display.statusProjectLimit` setting. The limit now applies only to the human-readable main project list; JSON output and the `Worktrees:` section remain unbounded.

## Key Changes

- Updated `src/commands/status.ts` to accept `--all`, resolve the effective main-list limit from config, treat `0` as unlimited, and keep the hidden-count indicator tied to real truncation only.
- Extended `StatusCommandOptions` in `src/types/config.ts` for the new flag.
- Expanded `tests/unit/status-command.test.ts` with command-level coverage for default `10`, custom limits, `0` unlimited, `--all`, unbounded `--json`, and unbounded worktree display.
- Updated `README.md` and `src/prompts/config-docs.md` to document the new flag, the default limit of `10`, the `display.statusProjectLimit` config key, and the `0` unlimited rule.

## Verification

- `npm test -- --runInBand tests/unit/config.test.ts tests/unit/config-command.test.ts tests/unit/status-command.test.ts`
- `npm run lint`

## Notes

- Main-project ordering remains unchanged: when truncated, `raf status` still shows the latest N numbered projects and reports the hidden count above the list.
- `raf status --all` only affects the human-readable main-project list for that invocation; it does not change config.

<promise>COMPLETE</promise>
