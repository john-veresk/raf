# Outcome: Fix Codex Error Event Rendering

## Summary

Fixed two renderer gaps in `codex-stream-renderer.ts` so that real-world Codex error events produce visible output instead of empty or generic text.

## Changes Made

### `src/parsers/codex-stream-renderer.ts`
- Added `message?: string` to the `item` shape in `CodexEvent` so error items can carry a message.
- Added `error?: { message?: string }` to `CodexEvent` for the nested error object on `turn.failed` events.
- Added `case 'error'` in `renderItemCompleted()` that renders `  ✗ Error: <message>\n` (matching the existing top-level error style).
- Updated `renderTurnFailed()` to prefer `event.error?.message` (the real Codex field) before falling back to `event.message` and then the generic `'Turn failed'` text.

### `tests/unit/codex-stream-renderer.test.ts` (new file)
- 8 focused tests covering both bug cases and confirming existing event types are unchanged:
  - `item.completed` with `item.type: "error"` renders error line
  - `item.completed` error with missing message uses fallback
  - `turn.failed` with `error.message` surfaces the real message
  - `turn.failed` falls back to `event.message` when no error object
  - `turn.failed` falls back to generic text when neither field present
  - Existing: `agent_message`, `command_execution`, top-level `error` event

## Acceptance Criteria

- [x] `item.completed` with `item.type: "error"` renders a visible error line.
- [x] `turn.failed.error.message` is surfaced in the rendered output.
- [x] Existing supported Codex event rendering remains unchanged.
- [x] Focused renderer tests cover both real-world bug cases.
- [x] All tests pass (4 pre-existing failures unrelated to this change)

<promise>COMPLETE</promise>
