# Task: Verbose Streaming Fix

## Objective
Investigate and fix why verbose mode only shows a summary of completed work instead of streaming Claude's real-time execution output.

## Context
The `runVerbose()` method in `claude-runner.ts` does call `process.stdout.write(text)` on stdout data, but users report only seeing a summary rather than a real-time stream. The likely root cause is that Claude CLI is invoked with the `-p` (print/pipe) flag, which runs in non-interactive mode and only outputs the final assistant response text — not the intermediate tool calls, file reads, code edits, and thinking steps that constitute the real-time execution flow.

The non-verbose `run()` method correctly uses `-p` since it only needs the final output for parsing. But `runVerbose()` needs a different approach to show Claude's work as it happens.

## Requirements
- Investigate the exact cause of why streaming doesn't show real-time Claude activity
- Fix `runVerbose()` to stream Claude's real-time execution output (tool calls, file operations, code writing, etc.)
- The fix likely involves either:
  - Removing `-p` flag and using a different mode that streams intermediate output
  - Using `--output-format stream-json` to get streaming JSON events and rendering them
  - Using PTY-based execution (like `runInteractive`) but without stdin interaction
- The completion marker detection must still work with the new approach
- Output parsing for success/failure must still function correctly
- The timeout mechanism must still work
- Non-verbose mode must remain unchanged

## Implementation Steps
1. Investigate what Claude CLI output modes are available (check `claude --help` or documentation)
2. Determine the best approach for streaming real-time output while maintaining completion detection
3. Modify `runVerbose()` to use the chosen streaming approach
4. Ensure completion markers can still be detected in the new output format
5. Test that timeout, context overflow detection, and kill mechanisms still work
6. Verify output can still be parsed for success/failure determination

## Acceptance Criteria
- [ ] `raf do --verbose` shows Claude's real-time execution (tool calls, file operations, thinking)
- [ ] Completion marker detection still works correctly
- [ ] Timeout mechanism still functions
- [ ] Context overflow detection still works
- [ ] Non-verbose mode (`raf do`) is completely unaffected
- [ ] Success/failure parsing still works from the captured output
- [ ] All existing tests pass (update as needed for new implementation)

## Notes
- The `run()` method must NOT be changed — only `runVerbose()` needs modification
- Claude CLI streaming options may include `--output-format stream-json` which outputs JSON events
- If using stream-json, a renderer/formatter will be needed to display events in a human-readable way
- PTY-based approach (similar to `runInteractive`) could work but would need `--dangerously-skip-permissions` to avoid interactive prompts
- The `activeProcess` tracking needs to work with whichever approach is chosen for the shutdown handler
