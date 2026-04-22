Implemented resize forwarding for RAF planning PTY sessions so terminal size changes are propagated after spawn instead of only being seeded once at launch.

Key changes made:
- Added `src/utils/pty-resize.ts` with a shared `forwardTerminalResize(...)` helper that subscribes to parent terminal `resize`, validates `columns`/`rows`, forwards them with `pty.resize(...)`, and returns a cleanup callback.
- Wired that helper into `ClaudeRunner.runInteractive`, `ClaudeRunner.runResume`, and `CodexRunner.runInteractive` so planning and Claude resume flows all clean up the listener during PTY exit teardown.
- Extended the interactive runner tests to cover listener registration, resize propagation, missing-dimension guards, non-TTY no-op behavior, and listener cleanup between repeated sessions.

## Decision Updates
None. The implementation followed the planned scope and stayed limited to planning-facing PTY sessions.

Important notes:
- Automated verification passed with `NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/claude-runner-interactive.test.ts tests/unit/codex-runner.test.ts`, `npm run lint`, and `npm run build`.
- A full hands-on terminal resize pass against `raf plan` / `raf plan --amend` / `raf plan --resume` still requires an operator-controlled interactive terminal. In this automation session I could confirm the real CLIs are installed and the `raf plan` command builds, but I could not physically resize the host terminal attached to this agent run.

<promise>COMPLETE</promise>
