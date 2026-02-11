# Task: Remove `claudeCommand` from Config

## Objective
Remove the `claudeCommand` configuration key entirely, hardcoding `"claude"` as the CLI binary name.

## Context
The `claudeCommand` config key allows overriding the Claude CLI binary path. In practice this is unnecessary — Claude CLI is always installed as `claude`. Removing it simplifies the config schema and also resolves the PR #4 review comment: with a broken config file, `getClaudeCommand()` could throw before `raf config` launched its repair session. Hardcoding eliminates that failure path.

## Requirements
- Remove `claudeCommand` from `RafConfig` interface and `DEFAULT_CONFIG` in `src/types/config.ts`
- Remove `getClaudeCommand()` accessor from `src/utils/config.ts`
- Update `getClaudePath()` in `src/core/claude-runner.ts` to hardcode `"claude"` instead of calling `getClaudeCommand()`
- Remove `claudeCommand` from config validation logic in `src/utils/config.ts`
- Update `src/prompts/config-docs.md` to remove the `claudeCommand` section
- Update any tests that reference `claudeCommand`
- Verify `raf config` works correctly even when `~/.raf/raf.config.json` is malformed (this is the PR #4 fix — with hardcoded command, `getClaudePath` no longer depends on config)

## Implementation Steps
1. Remove `claudeCommand` from the TypeScript interface and default config
2. Remove the `getClaudeCommand()` helper and update all call sites to use `"claude"` directly
3. Update `getClaudePath()` to use hardcoded `"claude"` in the `which` lookup
4. Remove `claudeCommand` from config validation (the strict validator should reject it as unknown key if a user still has it — consider adding a migration warning or silently ignoring it)
5. Update config-docs.md documentation
6. Update/remove affected tests
7. Verify the `raf config` fallback path no longer depends on config file state

## Acceptance Criteria
- [ ] `claudeCommand` key no longer exists in types, defaults, validation, or documentation
- [ ] `getClaudePath()` works without reading any config
- [ ] `raf config` launches successfully even with a completely broken config file
- [ ] All existing tests pass (updated as needed)
- [ ] Config files containing `claudeCommand` are handled gracefully (warning or silent ignore)

## Notes
- This also addresses the PR #4 review comment about `raf config` being unusable as a repair path when config is malformed. With the hardcoded command, the entire Claude runner initialization is config-independent.
- Consider whether to warn users who still have `claudeCommand` in their config or just silently ignore it via validation.
