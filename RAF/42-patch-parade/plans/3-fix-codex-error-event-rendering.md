---
effort: low
---
# Task: Fix Codex Error Event Rendering

## Objective
Render the remaining real-world Codex error event shapes so verbose output shows the actual failure text instead of empty or generic messages.

## Context
The scoped “minor bugs” come from `/Users/eremeev/projects/RAF/RAF/41-echo-chamber/outcomes/2-e2e-test-codex-provider.md`. Two minor renderer gaps remain: `item.completed` events with `item.type: "error"` produce no output, and `turn.failed` events that carry `error.message` fall back to the generic `Turn failed` text.

## Requirements
- Handle `item.completed` events where `item.type === "error"` and render the embedded error message.
- Handle `turn.failed` events that carry `error.message` and prefer that message over the generic fallback text.
- Preserve existing rendering behavior for already-supported Codex event types.
- Add focused tests that use the real event shapes documented in the outcome report.

## Implementation Steps
1. Update the Codex stream renderer switch logic to cover the missing error event variants.
2. Reuse existing formatting conventions so new error output matches current verbose output style.
3. Add focused unit tests for both missing event shapes.
4. Verify no existing renderer tests regress.

## Acceptance Criteria
- [ ] `item.completed` with `item.type: "error"` renders a visible error line.
- [ ] `turn.failed.error.message` is surfaced in the rendered output.
- [ ] Existing supported Codex event rendering remains unchanged.
- [ ] Focused renderer tests cover both real-world bug cases.
- [ ] All tests pass

## Notes
Keep this task narrowly scoped to the two bugs from the referenced outcome report.
