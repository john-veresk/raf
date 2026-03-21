# Task 1: Fix Codex JSONL Stream Renderer

## Summary
Updated `codex-stream-renderer.ts` to handle the real Codex CLI event format (nested `item.completed` events) while preserving existing Claude flat-format handlers.

## Changes Made

### File: `src/parsers/codex-stream-renderer.ts`
- Extended `CodexEvent` interface with `item` (nested object), `message`, and `usage` fields
- Added `item.completed` handler that dispatches on `item.type`: `agent_message`, `command_execution`, `file_change`
- Added `item.started` handler (no-op, renders on completion)
- Added `turn.completed` handler that extracts and displays usage data
- Added `error` handler — outputs error message in both `display` and `textContent`
- Added `turn.failed` handler — outputs failure message in both `display` and `textContent`
- All existing Claude-format handlers (`AgentMessage`, `CommandExecution`, `FileChange`, `McpToolCall`, `TodoList`) remain untouched

## Verification
- TypeScript compiles without errors (`npm run build`)
- All acceptance criteria met

<promise>COMPLETE</promise>
