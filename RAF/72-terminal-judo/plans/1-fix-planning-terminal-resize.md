---
effort: medium
---
# Task: Fix Planning Terminal Resize Handling

## Objective
Forward parent terminal resize events into RAF's PTY-backed planning sessions so Claude/Codex planning UIs keep a correct layout after window resizes.

## Requirements
- Verify the fix against the actual planning paths RAF uses today: `raf plan`, `raf plan --amend`, and Claude `raf plan --resume`.
- Update the PTY-backed interactive planning runners to propagate live terminal size changes after spawn instead of only seeding initial `cols`/`rows`.
- Keep the scope limited to planning-facing PTY sessions; do not broaden this task into non-interactive execution or unrelated UI cleanup.
- Guard resize forwarding so it is a no-op when RAF is not attached to a TTY or when width/height values are missing.
- Clean up resize listeners on every exit path to avoid leaked listeners or duplicate forwarding across multiple planning sessions.
- Add targeted automated coverage for resize forwarding and teardown behavior.
- Include manual verification steps that exercise at least one real planning session with terminal resizing during output.

## Key Decisions
- Scope is `Planning Only`: fix `raf plan`, `raf plan --amend`, and Claude resume picker behavior, not every PTY-backed RAF UI.
- Validation bar is `Manual + Targeted Tests`: the implementation should ship with focused unit coverage plus manual resize checks.
- The premise is already verified in code: `src/core/claude-runner.ts` and `src/core/codex-runner.ts` pass initial PTY dimensions at spawn time but never forward later `process.stdout` resize events.

## Acceptance Criteria
- [ ] Resizing the terminal during a Claude-backed `raf plan` session no longer leaves the child UI rendering against stale width/height.
- [ ] Resizing the terminal during a Codex-backed `raf plan` session no longer leaves the child UI rendering against stale width/height.
- [ ] Claude `raf plan --resume` also forwards resize events correctly.
- [ ] Interactive planning sessions remove their resize listeners during teardown, with no duplicate forwarding when a second session starts in the same RAF process.
- [ ] Automated tests cover resize propagation and listener cleanup for the planning runners.
- [ ] Manual verification notes capture the resize scenario exercised and any harness-specific gaps if one CLI is unavailable locally.

## Context
Native `claude`/`codex` sessions already handle terminal resizes correctly. RAF inserts a `node-pty` layer for planning sessions, and that wrapper currently seeds `cols`/`rows` once at spawn time without ever calling `pty.resize(...)` afterward. That leaves the child CLI rendering to stale dimensions after the terminal is resized.

## Implementation Steps
1. Introduce a small PTY resize-forwarding helper or equivalent runner-local abstraction that subscribes to the parent terminal resize event, reads current `process.stdout.columns` / `rows`, calls `pty.resize(cols, rows)`, and returns a cleanup function.
2. Wire that resize-forwarding lifecycle into `ClaudeRunner.runInteractive`, `ClaudeRunner.runResume`, and `CodexRunner.runInteractive` immediately after PTY spawn.
3. Ensure teardown always removes the resize listener alongside the existing stdin/PTy cleanup, including non-zero exits and killed sessions.
4. Extend the interactive runner unit tests to assert:
   - the listener is registered,
   - `resize()` is called with updated dimensions when the parent terminal emits `resize`,
   - the listener is removed on process exit.
5. Run targeted tests plus a manual resize pass in an actual planning session; record any remaining gaps if only one harness can be exercised locally.

## Files to Modify
- `src/core/claude-runner.ts`
- `src/core/codex-runner.ts`
- `tests/unit/claude-runner-interactive.test.ts`
- `tests/unit/codex-runner.test.ts`
- Optional if the extraction is cleaner than duplicating logic: a new shared utility under `src/utils/`

## Risks & Mitigations
- Listener leaks can accumulate across repeated planning sessions.
  Mitigation: make resize subscription disposable and clean it up in the same exit block that removes stdin listeners.
- Some environments may report transient or missing terminal dimensions during resize.
  Mitigation: ignore resize ticks unless both `columns` and `rows` are positive numbers.
- Claude and Codex interactive paths are separate implementations today.
  Mitigation: use one shared helper or mirror the same contract in both runners so behavior stays aligned.

## Notes
- README updates are probably unnecessary because no command, flag, or config surface changes are expected.
- `src/ui/name-picker.ts` has the same one-time `cols`/`rows` pattern, but it is intentionally out of scope for this task unless investigation proves the planning issue reproduces there too.
