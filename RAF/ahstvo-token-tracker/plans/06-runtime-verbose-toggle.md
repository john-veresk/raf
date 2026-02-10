# Task: Add Runtime Verbose Toggle During Task Execution

## Objective
Allow users to press Tab during task execution to toggle verbose mode on/off in real-time, showing or hiding tool-use activity lines.

## Context
After task 03 unifies all execution to stream-json, the underlying data stream always includes tool-use events. Verbose mode becomes purely a display concern — whether to print tool descriptions (e.g., "Reading src/file.ts", "Running: npm test") to the console. This makes runtime toggling straightforward: listen for Tab key on stdin and flip a boolean that controls display output.

## Dependencies
03

## Requirements
- During non-interactive task execution (`raf do`), listen for Tab keypress on `process.stdin`
- Pressing Tab toggles verbose display: tool-use lines are shown or hidden
- The initial state matches the `--verbose` flag (off by default, on if `--verbose` was passed)
- Display a brief indicator when toggling (e.g., `[verbose: on]` / `[verbose: off]`)
- stdin must be in raw mode to capture individual keypresses without requiring Enter
- Restore stdin to normal mode after task execution completes (or on process exit)
- Do not interfere with Ctrl+C signal handling (SIGINT must still work)
- Do not interfere with the child process — stdin is already `'ignore'` for spawned Claude

## Implementation Steps
1. Before starting task execution in `do.ts`, set up `process.stdin` in raw mode to capture keypresses
2. Listen for the Tab key (character code `\t` or `0x09`) on the stdin `data` event
3. Maintain a `verboseDisplay` boolean that the stream-json renderer checks before printing tool-use lines
4. On Tab press, flip the boolean and print a brief status indicator
5. Pass the `verboseDisplay` reference (or a callback/event emitter) to the stream renderer so it can check the current state for each event
6. On task completion (or process exit/error), restore stdin to cooked mode and remove the listener
7. Integrate with the shutdown handler to ensure clean terminal state on Ctrl+C
8. Add tests for the toggle mechanism

## Acceptance Criteria
- [ ] Tab key toggles verbose display during task execution
- [ ] Initial verbose state matches the `--verbose` CLI flag
- [ ] Tool-use lines appear/disappear immediately on toggle
- [ ] Brief status indicator shown on toggle
- [ ] Ctrl+C still works for graceful shutdown
- [ ] Terminal state is properly restored after execution
- [ ] No interference with child process stdin
- [ ] Works correctly across multiple sequential tasks
- [ ] All existing tests pass

## Notes
- Node.js `process.stdin.setRawMode(true)` is already used in `runInteractive()` so the pattern is familiar in this codebase
- The shutdown handler in `src/core/shutdown-handler.ts` already manages terminal cleanup — coordinate with it
- Since the child process has `stdio: ['ignore', 'pipe', 'pipe']`, parent stdin is free to use for keypress detection
- Consider showing the toggle hint at the start of execution: `Press Tab to toggle verbose mode`
- Edge case: if stdin is not a TTY (piped input), skip the keypress listener entirely
