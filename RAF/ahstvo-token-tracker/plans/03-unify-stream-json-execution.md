# Task: Unify Task Execution to Stream-JSON Format

## Objective
Switch all task execution modes to use `--output-format stream-json --verbose` so that token usage data is always available from the `result` event.

## Context
Currently `claude-runner.ts` has two execution methods: `run()` (plain text stdout) and `runVerbose()` (stream-json with tool display). Token usage data is only available in stream-json's `result` event. To enable token tracking, all execution must use stream-json format. The difference between verbose and non-verbose becomes purely a display concern — whether tool descriptions are printed to the console.

## Dependencies
01

## Requirements
- All task execution uses `--output-format stream-json --verbose` flags
- Non-verbose mode still suppresses tool-use display lines but still captures the stream-json data
- The `result` event from stream-json is always parsed and returned
- The return type of execution methods is updated to include usage data extracted from the result event
- Completion detection logic continues to work (parsing text content for markers)
- No change to interactive mode (`runInteractive()` with node-pty)

## Implementation Steps
1. Define a `UsageData` interface/type to represent token usage extracted from the stream-json result event (input tokens, output tokens, cache read tokens, cache creation tokens, per-model breakdown)
2. Update the `run()` method to use stream-json format internally, parse NDJSON lines, extract text content for completion detection, and capture the `result` event
3. Add a `verbose` display option that controls whether tool-use lines are printed to stdout (true = show tools, false = suppress)
4. Extract usage data from the `result` event's `usage` and `modelUsage` fields
5. Update the return type of both `run()` and `runVerbose()` (or unified method) to include `UsageData`
6. Update callers in `src/commands/do.ts` to receive and pass through usage data
7. Update tests for the new execution flow

## Acceptance Criteria
- [ ] `run()` and `runVerbose()` both return token usage data
- [ ] Non-verbose execution suppresses tool display but still gets usage data
- [ ] Verbose execution shows tool display as before AND returns usage data
- [ ] Completion detection (COMPLETE/FAILED markers) still works
- [ ] Context overflow detection still works
- [ ] Timeout behavior unchanged
- [ ] All existing tests pass

## Notes
- The stream-json result event structure (from actual CLI output):
  ```
  {"type":"result","usage":{"input_tokens":N,"output_tokens":N,"cache_creation_input_tokens":N,"cache_read_input_tokens":N},"modelUsage":{"claude-opus-4-6":{"inputTokens":N,"outputTokens":N,...}}}
  ```
- Consider merging `run()` and `runVerbose()` into a single method with a `verbose` option to reduce code duplication
- The `renderStreamEvent()` function in `src/parsers/stream-renderer.ts` already handles parsing — extend it to also return usage data when a `result` event is encountered
