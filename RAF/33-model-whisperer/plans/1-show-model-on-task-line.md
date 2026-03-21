---
effort: low
---
# Task: Show execution model on task line

## Objective
Display the resolved model name in parentheses on the task progress line (e.g., `● 01-auth-login (sonnet) 1:23`), always visible, not just in verbose mode.

## Context
Currently the execution model per task is only displayed in `--verbose` mode (`Model: claude-opus-4-6`). Users want to see which model is running each task at a glance during normal execution. The model should appear as a short alias (sonnet, opus, haiku) in parentheses, placed before the timer/counter.

## Requirements
- Show the **requested model** (from effort resolution), not actual models from the result
- Use short alias form: `(sonnet)`, `(opus)`, `(haiku)` — use `getModelShortName()` from `src/utils/config.ts`
- Display on ALL task states: running, completed, failed, blocked, pending
- Display in both verbose and non-verbose modes
- Format: `● 01-task-name (sonnet) 1:23` or `✓ 01-task-name (opus) 2m 45s`

## Implementation Steps

1. **Update `formatTaskProgress` signature** in `src/utils/terminal-symbols.ts` to accept an optional `model?: string` parameter
2. **Insert model in output** — when `model` is provided, add ` (${model})` after the display name and before the timer/counter:
   - With time: `` `${symbol} ${idPrefix}${displayName} (${model}) ${timeStr}` ``
   - Without time: `` `${symbol} ${idPrefix}${displayName} (${model}) ${current}/${total}` ``
3. **Pass model to `formatTaskProgress`** in `src/commands/do.ts`:
   - The resolved model is available from `modelResolution.model` (inside the while loop)
   - Use `getModelShortName(modelResolution.model)` to get the alias
   - Pass to the timer callback (line ~1034), completed line, failed line, blocked line
   - For blocked tasks (where model isn't resolved yet), pass `undefined`
4. **Update tests** in `tests/unit/terminal-symbols.test.ts`:
   - Add tests for `formatTaskProgress` with model parameter
   - Verify model appears between task name and timer

## Acceptance Criteria
- [ ] `formatTaskProgress` accepts optional `model` parameter
- [ ] Model shown in parentheses on running task status line (timer updates)
- [ ] Model shown on completed and failed task lines
- [ ] Short alias used (sonnet, not claude-sonnet-4-5-20250929)
- [ ] Blocked tasks show without model (since model isn't resolved)
- [ ] All existing `formatTaskProgress` tests pass (backwards compatible)
- [ ] New tests added for model display

## Notes
- `getModelShortName()` already exists in `src/utils/config.ts:421` and handles both aliases and full model IDs
- The model resolution happens inside the retry loop at `do.ts:1050`, so the model variable needs to be accessible in the timer callback — it should be stored outside the while loop and updated on each iteration
