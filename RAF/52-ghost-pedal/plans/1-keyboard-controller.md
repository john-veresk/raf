---
effort: medium
---
# Task: Rename VerboseToggle to KeyboardController and add pause/cancel state

## Objective
Rename `VerboseToggle` to `KeyboardController`, add 'p' (pause) and 'c' (cancel) key handling, and update the startup hint message to show all hotkeys.

## Context
Currently `VerboseToggle` in `src/utils/verbose-toggle.ts` only handles Tab for verbose toggling and Ctrl+C for SIGINT. We need to expand it to also track pause and cancel states via 'p' and 'c' keys, and update the hint shown at startup. This class is the single place that manages raw stdin input during execution.

## Requirements
- Rename file from `src/utils/verbose-toggle.ts` to `src/utils/keyboard-controller.ts`
- Rename class from `VerboseToggle` to `KeyboardController`
- Add `isPaused` boolean property (default `false`), toggled by 'p' key (0x70 lowercase)
- Add `isCancelled` boolean property (default `false`), set to `true` by 'c' key (0x63 lowercase) — one-way flag, no toggle
- When 'p' is pressed: toggle `_paused`, log `  [paused]` or `  [resumed]` via `logger.dim()`
- When 'c' is pressed: set `_cancelled = true`, log `  [stopping after current task...]` via `logger.dim()`. Ignore subsequent 'c' presses.
- Add a `waitForResume(): Promise<void>` method that returns immediately if not paused, or waits (polling or event-based) until unpaused. This will be called by the execution loop between tasks.
- Update the startup hint from `Press Tab to toggle verbose mode` to: `Hotkeys: Tab = verbose, P = pause, C = cancel`
- Update all imports across the codebase that reference `VerboseToggle` or `verbose-toggle`

## Implementation Steps
1. Create `src/utils/keyboard-controller.ts` with the renamed and expanded class:
   - Copy structure from `verbose-toggle.ts`
   - Add `_paused: boolean = false` and `_cancelled: boolean = false` private fields
   - Add public getters `isPaused` and `isCancelled`
   - In the `_dataHandler`, add cases for `0x70` ('p') and `0x63` ('c')
   - For 'p': also handle uppercase 'P' (0x50) for convenience
   - For 'c': also handle uppercase 'C' (0x43) for convenience
   - Add `waitForResume()` method: if `_paused` is false, return immediately. Otherwise, return a Promise that resolves when `_paused` becomes false (check via a short interval, e.g. 100ms, cleared on resolve or when stop() is called)
   - Update the hint message in `start()`
2. Delete `src/utils/verbose-toggle.ts`
3. Update imports in `src/commands/do.ts`: change `VerboseToggle` → `KeyboardController`, update import path
4. Update the variable name from `verboseToggle` to `keyboard` (or `keyboardController`) in `do.ts` for clarity
5. Verify no other files import from `verbose-toggle.ts` (grep for it)

## Acceptance Criteria
- [ ] `src/utils/verbose-toggle.ts` is deleted, `src/utils/keyboard-controller.ts` exists
- [ ] `KeyboardController` class has `isVerbose`, `isPaused`, `isCancelled` getters
- [ ] Pressing 'p'/'P' toggles pause state and logs status
- [ ] Pressing 'c'/'C' sets cancelled state (one-way) and logs status
- [ ] `waitForResume()` blocks (async) while paused, resolves when unpaused
- [ ] Hint message shows all three hotkeys
- [ ] All imports updated — project compiles with `npx tsc --noEmit`

## Notes
- The `waitForResume()` promise should also resolve if `stop()` is called (cleanup scenario), to avoid hanging.
- Keep `isVerbose` getter name as-is — it's used in many places via `verboseCheck` callbacks.
- Handle both upper and lowercase for 'p' and 'c' since caps lock may be on.
