# Outcome: Add Runtime Verbose Toggle During Task Execution

## Summary

Added a runtime verbose toggle that lets users press Tab during task execution to show or hide tool-use activity lines in real-time. The toggle works across sequential tasks, properly handles Ctrl+C for graceful shutdown, and automatically skips setup when stdin is not a TTY.

## Changes Made

### `src/utils/verbose-toggle.ts` (new file)
- `VerboseToggle` class that manages stdin raw mode and Tab keypress listening
- `start()`: sets stdin to raw mode, listens for Tab (0x09) to flip verbose state
- `stop()`: restores stdin to normal mode and removes the listener
- Ctrl+C (0x03) is re-emitted as `SIGINT` so the shutdown handler still works
- Shows `[verbose: on]` / `[verbose: off]` indicator on toggle
- Shows "Press Tab to toggle verbose mode" hint on start
- No-op when stdin is not a TTY (piped input)
- Safe to call `start()`/`stop()` multiple times

### `src/core/claude-runner.ts`
- Added `verboseCheck?: () => boolean` option to `ClaudeRunnerOptions`
- Updated `_runStreamJson()` to use `verboseCheck` callback when provided, falling back to static `verbose` parameter
- Both the main stdout handler and the remaining-buffer handler on `close` use `shouldDisplay()` callback

### `src/commands/do.ts`
- Imported `VerboseToggle`
- Creates `VerboseToggle` with initial state matching `--verbose` flag
- Registers `verboseToggle.stop()` as shutdown cleanup callback
- Starts toggle listener before the task execution loop
- Passes `verboseCheck: () => verboseToggle.isVerbose` to runner options
- Stops toggle listener after the task loop completes (before summary output)

### `tests/unit/verbose-toggle.test.ts` (new file)
- 15 tests covering:
  - Initial state, active state, TTY/non-TTY behavior
  - Tab keypress toggling (on/off)
  - Ctrl+C re-emitting SIGINT
  - Ignoring non-Tab keypresses
  - Multiple bytes in single data event
  - Stop/start lifecycle, double-call safety
  - No response after stop
  - Cross-task persistence (stop and restart)
  - setRawMode error handling

### `tests/unit/claude-runner.test.ts`
- Added 1 test: `verboseCheck` callback dynamically controls display output

## Verification

- TypeScript build passes cleanly
- All 1138 tests pass (16 new tests added)
- 1 pre-existing test failure confirmed unrelated (same on base branch)

<promise>COMPLETE</promise>
