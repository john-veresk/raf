---
effort: medium
---
# Task: Fix Codex JSONL Stream Renderer for Real Event Format

## Objective
Update the Codex stream renderer to handle the actual event format emitted by Codex CLI, while preserving existing Claude event handling.

## Context
The Codex CLI emits events in a nested format (`item.completed` with `item.type` sub-fields) but the renderer expects flat event types (`AgentMessage`, `CommandExecution`). This causes all Codex output to be silently dropped. The existing flat event types are used by Claude's renderer and must be preserved — this is NOT an "old" format, it's the Claude format.

## Requirements
- Handle real Codex CLI event types: `item.completed`, `item.started`, `turn.completed`, `error`, `turn.failed`
- For `item.completed`, dispatch on `item.type`: `agent_message` (text in `item.text`), `command_execution` (command in `item.command`), `file_change`
- Handle `error` and `turn.failed` events — capture error messages in both `display` and `textContent`
- Extract usage data from `turn.completed` events if available
- Keep existing `AgentMessage`, `CommandExecution`, `FileChange`, `McpToolCall`, `TodoList` handlers intact — these are for Claude
- Update the `CodexEvent` interface to model the real nested event structure

## Implementation Steps
1. Read `src/parsers/codex-stream-renderer.ts` to understand current structure
2. Update the `CodexEvent` interface to include nested item structure:
   - Add `item?: { type: string; text?: string; command?: string; exit_code?: number; path?: string; ... }`
   - Add fields for `error`, `turn.failed`, `turn.completed` events
3. Add new cases to the switch statement for real Codex event types:
   - `item.completed` → check `event.item.type` and dispatch to appropriate renderer
   - `item.started` → optionally render (or skip)
   - `turn.completed` → extract usage data if present
   - `error` → render error message in both display and textContent
   - `turn.failed` → render failure message in both display and textContent
4. Keep all existing cases (`AgentMessage`, `CommandExecution`, etc.) untouched
5. Build and verify no type errors

## Acceptance Criteria
- [ ] Real Codex `item.completed` events with `agent_message` type produce text output
- [ ] Real Codex `item.completed` events with `command_execution` type show command status
- [ ] `error` and `turn.failed` events produce visible error output in both display and textContent
- [ ] Existing Claude event handlers (`AgentMessage`, `CommandExecution`, etc.) continue to work unchanged
- [ ] TypeScript compiles without errors

## Notes
- Reference the outcomes file at `RAF/38-dual-wielder/outcomes/8-e2e-test-codex-provider.md` for exact real event JSON samples
- The `RenderResult` interface from `stream-renderer.ts` is the return type — keep using it
