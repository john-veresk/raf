---
effort: low
---
# Task: Add Effort And Fast To Do Model Display

## Objective
Augment every existing `raf do` model display to include task effort and a fast-mode marker when present.

## Context
`raf do` already shows the resolved model in compact task lines and in verbose execution logs. The user wants the same display points to carry more execution metadata so task routing is visible at a glance, without adding extra log lines.

## Requirements
- Update the same places where the model is currently shown; do not add new display locations.
- Compact task lines should follow the existing pattern with appended metadata, for example: `● 01-auth-login (sonnet, low, fast) 12s`.
- Omit the effort label when it is unavailable.
- Omit `fast` when the resolved model entry has `fast: false`, `null`, or `undefined`.
- Preserve current model identifier style per output surface.
- Running, completed, and failed compact lines must stay aligned with the current `formatTaskProgress()` behavior.
- Verbose `Model:` and retry logs should include the same effort/fast metadata rather than silently diverging from compact mode.

## Implementation Steps
1. Identify every `raf do` output path that currently renders model information, including the timer status line and verbose execution/retry logs in [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/commands/do.ts).
2. Extend the task progress formatter in [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/utils/terminal-symbols.ts) so it can render model plus optional effort/fast metadata without changing unrelated progress output.
3. Thread resolved frontmatter effort and `fast` from the task model resolution path into all current model-display call sites.
4. Keep truncation and spacing behavior stable so long task names still render cleanly.
5. Add or update unit tests for compact progress formatting and any `do` command expectations affected by the new suffix.

## Acceptance Criteria
- [ ] Running compact lines show model metadata in the same place the model appears today.
- [ ] Completed compact lines show model metadata in the same place the model appears today.
- [ ] Failed compact lines show model metadata in the same place the model appears today.
- [ ] Verbose `Model:` and retry logs include effort and `fast` metadata when available.
- [ ] Effort is omitted when unavailable.
- [ ] `fast` is omitted when falsy.
- [ ] Existing output-format tests pass after expectation updates.

## Notes
- Reasonable assumption: verbose logs should keep the current resolved model identifier style and append metadata instead of replacing the model string.
