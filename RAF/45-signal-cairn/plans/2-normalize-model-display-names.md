---
effort: medium
---
# Task: Normalize Model Display Names

## Objective
Make all user-facing model labels flow through one centralized formatter so aliases like `gpt54` display as canonical names such as `gpt-5.4` during planning and execution.

## Context
RAF currently mixes display helpers: some places show a full resolved model ID, while others call `getModelShortName()` and end up rendering compact aliases like `gpt54`. The user specifically called out `raf do` task status and the planning log line `Generating project name suggestions with gpt54`, and asked for this to become a global display rule rather than a one-off patch. The implementation should therefore centralize model display formatting and reuse existing model-resolution data instead of hardcoding the string in individual commands.

## Dependencies
1

## Requirements
- Introduce or reuse a single helper for user-facing model labels instead of formatting aliases ad hoc at call sites.
- Ensure `gpt54` displays as `gpt-5.4` anywhere model names are shown to the user, including task status during `raf do` and planning logs during name generation.
- Apply the same centralized display rule to other command/log surfaces that currently expose model aliases, such as model-selection logs and verbose execution lines.
- Derive display names from the existing model alias/full-ID mapping source in config utilities rather than scattering special cases.
- Preserve the current UX where concise Claude labels like `opus`, `sonnet`, and `haiku` remain readable unless a surface already intentionally shows a full resolved model ID.
- Update tests that assert on task progress formatting, plan logging, config/model helper behavior, and any other user-facing model strings touched by the refactor.

## Implementation Steps
1. Audit current model-display call sites in [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/commands/plan.ts), [src/commands/do.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/commands/do.ts), [src/commands/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/commands/config.ts), and any shared terminal helpers to identify where aliases are exposed directly.
2. Add a centralized display formatter in [src/utils/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/utils/config.ts) or the most appropriate shared utility, backed by the existing alias-to-full-ID mapping so canonical display names come from one source.
3. Replace direct `getModelShortName()` or equivalent alias formatting at user-facing log/status call sites with the new display helper, including the `raf do` status line and `raf plan` name-generation message.
4. Keep intentionally full-ID surfaces intact where RAF already means to show the full resolved model, but route those decisions through explicit helper usage so the display policy is clear.
5. Update and extend unit tests for config display helpers, terminal task-status formatting, and command output expectations so `gpt54` no longer appears in user-facing output.
6. Run the relevant tests and tighten any stale assertions that still depend on alias-style display strings.

## Acceptance Criteria
- [ ] `raf do` task status shows `gpt-5.4` instead of `gpt54` when the resolved model is the GPT-5.4 alias.
- [ ] `raf plan` logs `Generating project name suggestions with gpt-5.4...` when name generation uses that alias.
- [ ] User-facing model logging/status surfaces use one centralized display formatter instead of per-call-site alias handling.
- [ ] The formatter derives `gpt-5.4` from shared model metadata rather than a one-off string replacement in command code.
- [ ] Updated tests cover the new display behavior and pass.
- [ ] All tests pass

## Notes
- The goal is display normalization, not a behavioral change to model resolution.
- Be careful not to regress surfaces that intentionally show full resolved IDs via `resolveFullModelId()`; unify the policy, not necessarily the exact string everywhere.
