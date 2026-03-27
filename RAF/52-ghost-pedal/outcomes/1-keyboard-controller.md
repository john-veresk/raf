# Outcome: Rename VerboseToggle to KeyboardController and add pause/cancel state

## Summary
Renamed `VerboseToggle` to `KeyboardController`, added 'p' (pause) and 'c' (cancel) key handling, and updated the startup hint to show all hotkeys.

## Key Changes
- **Renamed** `src/utils/verbose-toggle.ts` → `src/utils/keyboard-controller.ts`, class `VerboseToggle` → `KeyboardController`
- **Added** `isPaused` boolean getter, toggled by 'p'/'P' key, logs `[paused]`/`[resumed]`
- **Added** `isCancelled` boolean getter (one-way), set by 'c'/'C' key, logs `[stopping after current task...]`
- **Added** `waitForResume()` async method that blocks while paused and resolves on unpause or stop()
- **Updated** startup hint to: `Hotkeys: Tab = verbose, P = pause, C = cancel`
- **Updated** imports in `src/commands/do.ts` (variable renamed from `verboseToggle` to `keyboard`)
- **Renamed** test file to `tests/unit/keyboard-controller.test.ts` with 22 tests (all passing), including new tests for pause, cancel, and waitForResume

## Verification
- `npx tsc --noEmit` passes cleanly
- All 22 unit tests pass

<promise>COMPLETE</promise>
