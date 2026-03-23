---
effort: medium
---
# Task: Full Codex Model IDs Everywhere

## Objective
Render Codex models with full canonical IDs such as `gpt-5.3-codex` and `gpt-5.4` on every user-facing RAF surface instead of the shortened `codex` label.

## Context
RAF already has centralized model-display logic in `src/utils/config.ts`, but that logic intentionally collapses `gpt-5.3-codex` to `codex`. The user wants the full Codex version shown everywhere, not just in the live `raf do` task status line. Existing user-facing call sites include `src/commands/do.ts`, `src/commands/plan.ts`, `src/commands/config.ts`, `src/core/pull-request.ts`, and shared terminal-formatting helpers.

## Requirements
- Change the shared display policy so Codex aliases resolve to full canonical IDs in user-facing output.
- Apply the change everywhere RAF shows model names, including `raf do` status lines, plan logs, config/model logs, failure-analysis logs, and PR-generation logs.
- Keep existing explicit full-ID surfaces working through the same shared helper rather than one-off string replacements.
- Preserve concise Claude labels like `opus`, `sonnet`, and `haiku` unless a surface explicitly opts into full resolved IDs.
- Update any stale tests that still expect `codex` or other shortened Codex labels.

## Implementation Steps
1. Audit current model-label call sites in `src/commands/do.ts`, `src/commands/plan.ts`, `src/commands/config.ts`, `src/core/pull-request.ts`, and `src/utils/terminal-symbols.ts` to confirm they all flow through shared display helpers.
2. Update the centralized display mapping in `src/utils/config.ts` so:
   - `codex` displays as `gpt-5.3-codex`
   - `gpt54` displays as `gpt-5.4`
   - already-full Codex IDs remain unchanged
   - Claude aliases remain compact
3. Keep `resolveFullModelId()` and `formatModelDisplay()` aligned so call sites that intentionally request full IDs continue to behave predictably.
4. Remove any direct alias-shortening assumptions from command/status code and route all user-facing labels through the shared helper.
5. Update tests in `tests/unit/config.test.ts`, `tests/unit/terminal-symbols.test.ts`, `tests/unit/command-output.test.ts`, and any `do`-specific model-display coverage that still expects `codex`.
6. Update `README.md` only if it contains examples or wording that mention the shortened Codex label in user-facing output.

## Acceptance Criteria
- [ ] `raf do` task status lines show `gpt-5.3-codex` or `gpt-5.4` instead of `codex`/`gpt54`.
- [ ] Planning and config logs show full Codex IDs anywhere RAF renders Codex models to the user.
- [ ] Claude labels remain compact unless a full-ID path is explicitly requested.
- [ ] Shared config/model-display helpers are the single source of truth for the new behavior.
- [ ] Unit tests cover the new display policy and pass.

## Notes
Expected display examples:

- `codex` alias -> `gpt-5.3-codex`
- `gpt54` alias -> `gpt-5.4`
- `claude/opus` display label -> `opus`

This task is a display-policy change only. It should not alter model resolution, model ceilings, or execution behavior.
