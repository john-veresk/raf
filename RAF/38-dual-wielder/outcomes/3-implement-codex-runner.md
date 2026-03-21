# Task 3: Implement Codex Runner

## Summary
Implemented `CodexRunner` class that wraps the Codex CLI binary, providing the same `ICliRunner` interface as `ClaudeRunner`. Includes a dedicated JSONL stream renderer for Codex event types and factory integration.

## Changes Made

### New Files
- **`src/parsers/codex-stream-renderer.ts`**: Parses Codex JSONL events (`AgentMessage`, `CommandExecution`, `FileChange`, `McpToolCall`, `TodoList`) into `RenderResult` format shared with Claude's renderer. Unknown event types are skipped gracefully.
- **`src/core/codex-runner.ts`**: `CodexRunner` implementing `ICliRunner` with:
  - `runInteractive()`: Spawns `codex -m <model> <combined_prompt>` via PTY with stdin/stdout passthrough
  - `run()` / `runVerbose()`: Spawns `codex exec --full-auto --json --ephemeral -m <model> <prompt>` and parses JSONL output
  - `runResume()`: Throws error (not supported by Codex CLI)
  - `kill()` / `isRunning()`: Same graceful shutdown pattern as ClaudeRunner
  - System prompt prepended to user message as `[System Instructions]...[User Request]...` format
  - Shared completion detector for outcome file monitoring
  - Context overflow detection
  - Usage data gracefully omitted (Codex doesn't provide it in the same format)

### Modified Files
- **`src/core/runner-factory.ts`**: Imports `CodexRunner` and returns `new CodexRunner(config)` for `provider: 'codex'` (replaces the "not yet implemented" error)

## Acceptance Criteria
- [x] `CodexRunner` implements `ICliRunner` fully
- [x] `codex exec` spawns correctly with proper flags (`--full-auto --json --ephemeral -m`)
- [x] System prompt is prepended to user message correctly
- [x] JSONL events are parsed and displayed properly in verbose mode
- [x] Interactive mode works via PTY
- [x] Timeout and completion detection work
- [x] `createRunner({ provider: 'codex' })` returns a working CodexRunner
- [x] TypeScript compiles without errors

## Notes
- Codex usage data is omitted (returns `undefined`) since Codex doesn't provide token usage in the same format as Claude's stream-json.
- The `--ephemeral` flag is used in non-interactive mode to avoid session persistence pollution.
- The pre-existing `name-generator.test.ts` failure remains — unrelated to this task.

<promise>COMPLETE</promise>
