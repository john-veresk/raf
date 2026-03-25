# Outcome: Fix Codex task timeout enforcement with SIGKILL fallback

## Summary

Added reliable process termination with SIGKILL escalation and process group killing to prevent runaway tasks from exceeding their configured timeout.

## Key Changes

- **`src/utils/process-kill.ts`** (new): Shared `killProcessGroup()` utility that sends SIGTERM to the entire process group (`process.kill(-pid)`), then escalates to SIGKILL after a 15-second grace period if the process hasn't exited. Handles "already dead" cases gracefully.

- **`src/core/codex-runner.ts`**:
  - Added `detached: true` to `spawn()` options so the child becomes a process group leader
  - Replaced all `proc.kill('SIGTERM')` calls (timeout, context overflow, completion detector killFn) with `killProcessGroup(proc, reason)`
  - Updated `kill()` method to use `killProcessGroup` for spawn'd ChildProcess instances

- **`src/core/claude-runner.ts`**: Same changes as codex-runner — `detached: true`, `killProcessGroup` for timeout/overflow/completion/manual kill

## Verified Acceptance Criteria

- Timed-out tasks get SIGTERM immediately, then SIGKILL after 15s if still alive
- Process group kill (`-pid`) ensures child processes are also terminated
- Both codex-runner and claude-runner use the same pattern
- Completion detector's killFn uses `killProcessGroup`
- Manual `kill()` method uses `killProcessGroup` for non-PTY processes
- All kill sites log the reason (timeout, context overflow, completion detected, manual kill)
- `proc.on('close')` still fires correctly — `detached: true` doesn't affect close event delivery
- Normal completion unaffected — timeout/completion/overflow paths unchanged structurally
- TypeScript compiles cleanly with no errors

<promise>COMPLETE</promise>
