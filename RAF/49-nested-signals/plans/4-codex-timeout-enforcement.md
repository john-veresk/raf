---
effort: high
---
# Task: Fix Codex task timeout enforcement with SIGKILL fallback

## Objective
Ensure Codex tasks are reliably killed when they exceed the configured timeout, preventing runaway processes (observed: 1h28m on a 60min limit).

## Context
A Codex task ran for 1h28m despite a 60-minute timeout. The current implementation in `src/core/codex-runner.ts` uses `setTimeout` + `proc.kill('SIGTERM')` at line 224-228. There are several potential reasons SIGTERM alone is insufficient:

1. **SIGTERM can be caught/ignored**: The Codex CLI process may trap SIGTERM for graceful shutdown but take too long (or hang) during cleanup.
2. **Child processes survive**: `spawn()` without `detached: true` only kills the direct child process. If Codex CLI spawns subprocesses (API calls, sandboxed execution), those survive the parent's death and the parent may wait for them.
3. **No SIGKILL escalation**: After sending SIGTERM, there's no fallback. If the process doesn't exit, the `proc.on('close')` handler never fires, and the promise never resolves.

The same issue likely affects the Claude runner (`src/core/claude-runner.ts`), which has a similar pattern.

## Dependencies
2

## Requirements
- After SIGTERM, if the process hasn't exited within a grace period, send SIGKILL
- Kill the entire process group (parent + children) to prevent orphaned subprocesses
- The fix must apply to both `codex-runner.ts` and `claude-runner.ts`
- The existing `kill()` method (used by shutdown handler) should also use the escalation pattern
- Timeout values must be correctly validated and converted (minutes → ms)
- Log when escalating from SIGTERM to SIGKILL for debugging

## Implementation Steps

### 1. Investigate and understand the current timeout flow
- Read `src/core/codex-runner.ts` lines 172-322 (`_runExec` method)
- Read `src/core/claude-runner.ts` — find the equivalent `_runInteractive` or `_runExec` method and its timeout handling
- Read `src/core/completion-detector.ts` — understand the grace period and how it interacts with timeout
- Check if the completion detector's `killFn` (which also does `proc.kill('SIGTERM')`) has the same issue

### 2. Create a shared process-kill utility
Create a helper function (in `src/utils/` or `src/core/`) that handles reliable process termination:

```typescript
// src/utils/process-kill.ts
import { ChildProcess } from 'child_process';
import { logger } from './logger.js';

const SIGKILL_GRACE_MS = 15_000; // 15 seconds after SIGTERM before SIGKILL

export function killProcessGroup(proc: ChildProcess, reason: string): void {
  const pid = proc.pid;
  if (!pid) return;

  logger.debug(`Sending SIGTERM to process group ${pid} (${reason})`);

  // Try to kill the entire process group
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // Process group kill failed, try direct kill
    try {
      proc.kill('SIGTERM');
    } catch {
      // Already dead
      return;
    }
  }

  // Set up SIGKILL escalation
  const sigkillHandle = setTimeout(() => {
    logger.warn(`Process ${pid} did not exit after SIGTERM, sending SIGKILL (${reason})`);
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        proc.kill('SIGKILL');
      } catch {
        // Already dead
      }
    }
  }, SIGKILL_GRACE_MS);

  // Clean up the SIGKILL timer if process exits
  proc.once('close', () => {
    clearTimeout(sigkillHandle);
  });
}
```

### 3. Modify process spawning to use process groups
In both `codex-runner.ts` and `claude-runner.ts`, change `spawn()` to use `detached: true`:

```typescript
const proc = spawn(codexPath, execArgs, {
  cwd,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,  // Create a new process group
});
```

**Important**: With `detached: true`, the child won't keep the parent alive. This is fine since we're already managing the lifecycle via the promise/close handler. But ensure the parent still receives `close` events.

### 4. Update timeout handler in codex-runner.ts
Replace the simple `proc.kill('SIGTERM')` at line 227 with:
```typescript
const timeoutHandle = setTimeout(() => {
  timedOut = true;
  logger.warn('Codex session timed out');
  killProcessGroup(proc, 'timeout');
}, timeoutMs);
```

### 5. Update context overflow kill in codex-runner.ts
Replace `proc.kill('SIGTERM')` at line 268 with:
```typescript
killProcessGroup(proc, 'context overflow');
```

### 6. Update completion detector kill function
In `do.ts` where the completion detector is created (via runner options), the `killFn` passed to `createCompletionDetector` should also use the new utility. Check how `completionDetector` invokes its kill — it likely does `() => proc.kill('SIGTERM')`.

In `codex-runner.ts` line 231-233:
```typescript
const completionDetector = createCompletionDetector(
  () => killProcessGroup(proc, 'completion detected'),
  outcomeFilePath,
  commitContext,
);
```

### 7. Update the `kill()` method
The `kill()` method at codex-runner.ts:327 should use the same utility:
```typescript
kill(): void {
  if (this.activeProcess) {
    this.killed = true;
    killProcessGroup(this.activeProcess, 'manual kill');
  }
}
```

### 8. Apply the same changes to claude-runner.ts
- Find the equivalent timeout, context overflow, and kill patterns
- Replace `proc.kill('SIGTERM')` with `killProcessGroup(proc, reason)` everywhere
- Add `detached: true` to the spawn options

### 9. Verify timeout value propagation
- Trace the `timeout` option from `raf do --timeout` CLI flag through to the runner
- Confirm minutes-to-milliseconds conversion is correct: `validatedTimeout * 60 * 1000`
- Check if the timeout option is being passed correctly through the runner options chain

## Acceptance Criteria
- [ ] A Codex task that exceeds its timeout is killed within 15 seconds of the timeout expiring
- [ ] SIGKILL is sent if SIGTERM doesn't terminate the process within the grace period
- [ ] Child processes spawned by Codex CLI are also killed (process group kill)
- [ ] The same fix is applied to the Claude runner
- [ ] The completion detector's kill function uses the new utility
- [ ] The manual `kill()` method uses the new utility
- [ ] Timeout and context overflow kills are logged with the reason
- [ ] The `proc.on('close')` handler still fires correctly after process group kill
- [ ] Normal (non-timeout) task completion is unaffected

## Notes
- `detached: true` on macOS/Linux creates a new process group with PGID = child PID. `process.kill(-pid, signal)` sends the signal to all processes in that group.
- On macOS, `process.kill(-pid)` requires the PID to be a process group leader. With `detached: true`, the spawned process IS the group leader.
- The SIGKILL grace period (15s) should be long enough for normal cleanup but short enough to not waste time on truly hung processes.
- Watch out for the `proc.unref()` pitfall with `detached: true` — do NOT call `proc.unref()` since we need the close event.
- The completion detector also calls `killFn` — make sure it doesn't double-kill or cause race conditions with the timeout handler. Both paths should be safe since `killProcessGroup` handles "already dead" gracefully.
