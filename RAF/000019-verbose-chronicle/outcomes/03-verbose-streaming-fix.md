# Outcome: Verbose Streaming Fix

## Summary
Fixed `runVerbose()` to stream Claude's real-time execution output (tool calls, file operations, text) by using `--output-format stream-json --verbose` instead of plain `-p` mode which only showed the final summary.

## Root Cause
The `runVerbose()` method used the same `-p` (print) flag as `run()`, which runs Claude in non-interactive mode and only outputs the final assistant response text. This meant users saw a summary of completed work rather than real-time streaming of Claude's activity.

## Changes Made

### `src/parsers/stream-renderer.ts` (NEW)
- **Stream event parser**: Parses NDJSON lines from Claude CLI `stream-json` output
- **Human-readable rendering**: Converts events to user-friendly display:
  - Text blocks: displayed directly
  - Tool calls: descriptive one-line summaries (e.g., `→ Reading /src/main.ts`, `→ Running: npm test`)
  - System/result events: suppressed (not useful for display)
- **Tool descriptions**: Custom formatting for Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, TodoWrite, Task, and NotebookEdit tools
- **Text content extraction**: Returns text content separately for completion marker detection and output parsing

### `src/core/claude-runner.ts`
- **Modified `runVerbose()` spawn args**: Added `--output-format stream-json --verbose` flags to get real-time NDJSON streaming events
- **NDJSON line buffering**: Added line buffer to handle data chunks that split across NDJSON line boundaries
- **Event rendering pipeline**: Each complete NDJSON line is parsed by `renderStreamEvent()`, display text goes to stdout, text content accumulates in `output` for completion detection and parsing
- **Preserved all existing behavior**: Timeout, context overflow detection, completion marker detection, outcome file polling, and kill mechanisms all work unchanged
- **`run()` method unchanged**: Non-verbose mode remains exactly as before

### `tests/unit/stream-renderer.test.ts` (NEW)
- 25 tests covering all event types: system, assistant (text), assistant (tool_use), user (tool results), result
- Edge cases: empty lines, invalid JSON, empty content, unknown events
- Tool-specific rendering: all 11 supported tools tested

### `tests/unit/claude-runner.test.ts`
- Added 4 new tests in `verbose stream-json output` describe block:
  - Verifies `runVerbose()` includes `--output-format stream-json --verbose` flags
  - Verifies `run()` does NOT include these flags
  - Verifies NDJSON assistant events are parsed and text extracted correctly
  - Verifies tool_use events don't add text to output

## Acceptance Criteria
- [x] `raf do --verbose` shows Claude's real-time execution (tool calls, file operations, thinking)
- [x] Completion marker detection still works correctly
- [x] Timeout mechanism still functions
- [x] Context overflow detection still works
- [x] Non-verbose mode (`raf do`) is completely unaffected
- [x] Success/failure parsing still works from the captured output
- [x] All existing tests pass (786 pass, 1 pre-existing failure in planning-prompt.test.ts is unrelated)

<promise>COMPLETE</promise>
