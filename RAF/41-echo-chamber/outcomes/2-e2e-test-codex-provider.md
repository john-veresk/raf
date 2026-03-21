# Outcome: E2E Test Codex Provider (Post-Fix Verification)

## Summary
Comprehensive E2E testing of the Codex provider after fixes from RAF[38:8]. All 3 previously-found critical/major issues are confirmed fixed. Full task execution (`raf-dev do --provider codex`) works end-to-end. Two new minor issues discovered.

## Test Results

### Fix #1: JSONL Stream Renderer (was CRITICAL) — PASS
- 10/10 unit tests pass against `renderCodexStreamEvent()`
- Tested: `item.completed` (agent_message, command_execution, file_change), `error`, `turn.failed`, `turn.completed` (usage), flat-format events (AgentMessage, CommandExecution), unknown events, `item.started` (skipped)
- All events produce correct display and textContent — the bug where events hit the default case and produced empty output is fixed

### Fix #2: `--provider` CLI Flag (was CRITICAL) — PASS
- 4/4 runner factory tests pass
- `createRunner({ provider: 'codex' })` → `CodexRunner` (not `ClaudeRunner`)
- `do.ts` line 200: `-p, --provider` defined; line 402: `options.provider` forwarded
- `plan.ts` line 77: `-p, --provider` defined; lines 287/531/709: provider forwarded to `createRunner()`

### Fix #3: Error Events (was MAJOR) — PASS
- Top-level `error` events render correctly: `✗ Error: <message>`
- `turn.failed` with `message` field renders: `✗ Failed: <message>`
- Tested with real Codex error output (invalid model → 400 error)

### `raf-dev do --provider codex` (Full Flow) — PASS
- Spawned `codex exec --full-auto --json --ephemeral -m gpt-5.3-codex <prompt>`
- JSONL stream rendered correctly in verbose mode (agent messages, commands, file changes, usage)
- Task completed successfully: code modified, outcome written, commit created
- Usage data captured: in: 215481, out: 3420
- Total execution time: ~2m 25s

### `raf-dev plan --provider codex` (Interactive) — PARTIAL (PTY limitation)
- `--provider codex` flag accepted and routed correctly
- Command starts up and reaches editor prompt
- Full interactive PTY testing not possible from non-TTY context (Claude Code environment)
- Direct `codex` interactive mode also requires real TTY (`stdin is not a terminal`)
- **Conclusion**: Code path is wired correctly; full interactive testing requires a real terminal session

### Model Resolution — PASS
- `effort: low` → `gpt-5.3-codex` (updated in task 1) ✓
- `effort: medium` → `gpt-5.3-codex` ✓
- `effort: high` → `gpt-5.4` ✓
- `nameGeneration` → `gpt-5.3-codex` (updated in task 1) ✓
- `failureAnalysis` → `gpt-5.3-codex` (updated in task 1) ✓
- Note: Model resolution tests pass only with the worktree build (task 1 changes). The main project dist still has `gpt-5.3-codex-spark` references until this branch merges.

### Model Availability — PASS
- `gpt-5.4`: works ✓
- `gpt-5.4-mini`: works ✓
- `gpt-5.3-codex`: works ✓ (used in full flow test)

## New Issues Found

### NEW-1: `item.completed` with `item.type: "error"` not rendered (MINOR)
- **Severity**: Minor
- Codex emits `{"type":"item.completed","item":{"type":"error","message":"..."}}` for some errors
- The `renderItemCompleted()` switch only handles `agent_message`, `command_execution`, `file_change` — `error` falls to default (empty output)
- **Impact**: Low — Codex also emits a separate top-level `{"type":"error"}` event which IS handled, so the error message still appears

### NEW-2: `turn.failed` with nested `error.message` uses default text (MINOR)
- **Severity**: Minor
- Real Codex output: `{"type":"turn.failed","error":{"message":"..."}}`
- Renderer reads `event.message` but real event has `event.error.message`
- Displays "Turn failed" (default) instead of the actual error message
- **Impact**: Low — the preceding `error` event already displays the full message

## Comparison with RAF[38:8]

| Issue | RAF[38:8] Status | Current Status |
|-------|-----------------|----------------|
| JSONL stream renderer wrong format | CRITICAL - all events empty | FIXED ✓ |
| `--provider` flag no-op | CRITICAL - always used Claude | FIXED ✓ |
| Error events silently swallowed | MAJOR - no error display | FIXED ✓ |

<promise>COMPLETE</promise>
