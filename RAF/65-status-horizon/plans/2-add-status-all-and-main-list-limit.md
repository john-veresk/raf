---
effort: medium
---
# Task: Add Status All Flag And Main-List Limit

## Objective
Make the human-readable main project list in `raf status` configurable and add `--all` as an explicit override.

## Requirements
- Add `--all` to `raf status`.
- Apply truncation only to the human-readable main project list, never to `--json`.
- Use `display.statusProjectLimit` for the default plain-text main-list limit.
- Treat config value `0` as unlimited for the main project list.
- Make `--all` override the configured limit and show all main projects even when the config is nonzero.
- Leave the `Worktrees:` section unchanged and unbounded.
- Preserve existing project ordering and the hidden-count indicator when truncation occurs.
- Update user-facing docs to describe the new flag, the default limit of 10, the config key, and the `0` unlimited rule.

## Acceptance Criteria
- [ ] Default `raf status` still shows the last 10 main-repo projects when no custom config is set.
- [ ] A custom `display.statusProjectLimit` changes only the human-readable main project list.
- [ ] `display.statusProjectLimit: 0` shows all main projects without requiring `--all`.
- [ ] `raf status --all` shows all main projects regardless of the configured limit.
- [ ] `raf status --json` continues to return the full project list and full worktree section.
- [ ] The `Worktrees:` section is not truncated by either the config key or the new flag.
- [ ] README and config docs match the implemented behavior.

## Dependencies
- 1

## Context
The current code hardcodes `MAX_DISPLAYED_PROJECTS = 10` in [src/commands/status.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/commands/status.ts), while the README currently claims `raf status` lists all projects. This task replaces that hardcoded limit with the new config contract and exposes an explicit CLI escape hatch.

## Implementation Steps
1. Extend `StatusCommandOptions` and the commander definition in [src/commands/status.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/commands/status.ts) to accept `--all`.
2. Replace the hardcoded plain-text truncation logic with resolved config-driven logic for the main project list only, keeping the existing `--json` branch untouched.
3. Ensure the hidden-count indicator is emitted only when the effective limit is nonzero and truncation actually happened.
4. Add/adjust unit coverage in [tests/unit/status-command.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/status-command.test.ts) for default 10 behavior, custom limits, `0` unlimited, and `--all` override.
5. Update [README.md](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/README.md) and [src/prompts/config-docs.md](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/prompts/config-docs.md) so command examples, option tables, config examples, and validation notes all describe the new behavior.

## Files to Modify
- [src/commands/status.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/commands/status.ts)
- [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/types/config.ts)
- [tests/unit/status-command.test.ts](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/tests/unit/status-command.test.ts)
- [README.md](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/README.md)
- [src/prompts/config-docs.md](/Users/eremeev/.raf/worktrees/RAF/65-status-horizon/src/prompts/config-docs.md)

## Risks & Mitigations
- The status command has separate flows for main projects, worktrees, and JSON output.
Keep the limit calculation local to the human-readable main-list branch so JSON and worktree behavior do not regress.
- README currently documents behavior that no longer matches the CLI.
Update command examples and option tables in the same task as the implementation so the docs cannot drift again.

## Notes
- Reuse the existing “last N projects, oldest hidden at top” behavior; only the source of `N` changes.
- The config and CLI precedence should stay consistent with the rest of RAF: `--all` wins over config, config wins over defaults.
