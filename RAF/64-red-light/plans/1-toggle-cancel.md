---
effort: medium
---
# Task: Toggle Pending Cancel During Execution

## Objective
Change `raf do` so `C` toggles a pending graceful stop on and off, including during rate-limit waits, without turning the interrupted task into a failure.

## Requirements
- Update `src/utils/keyboard-controller.ts` so `c`/`C` toggles the pending cancel flag instead of latching it one-way.
- Update runtime messaging to reflect toggle semantics: the hotkey hint should advertise toggle behavior, and a second `C` press should log that the pending cancel was cleared.
- Preserve the existing safe-boundary behavior for active runs: if cancel is armed while a task is running, RAF still lets that task finish and then stops before starting the next task.
- Honor the same pending-cancel state after `waitForRateLimit(...)` in `src/commands/do.ts`: if cancel is still armed when the wait completes, do not start the retry attempt for the same task.
- Do not treat a soft cancel during the rate-limit path as a task failure. No failure analysis, stash-on-failure flow, or FAILED outcome file should be produced just because the user chose not to retry.
- Keep soft cancel distinct from shutdown. `Ctrl+C` and `shutdownHandler.isShuttingDown` must continue to abort immediately, while `C` remains a graceful stop at the next safe boundary.
- Add regression coverage for toggle-on/toggle-off behavior and for the rate-limit retry boundary.
- Document the runtime hotkeys and cancel behavior in `README.md`.

## Acceptance Criteria
- [ ] Pressing `C` once during execution logs a pending-stop message, and pressing `C` again before the next boundary logs that cancel was cleared.
- [ ] During a normal task run, leaving cancel armed still stops RAF only after the current task completes.
- [ ] During a rate-limit wait, leaving cancel armed prevents the retry from starting; clearing it before the wait ends allows the retry to proceed.
- [ ] A soft cancel during a rate-limit wait does not generate a FAILED outcome for the current task.
- [ ] `Ctrl+C` still triggers the existing shutdown path immediately.
- [ ] Unit tests cover the new toggle semantics and the do/rate-limit regression.
- [ ] `README.md` describes the hotkeys and the graceful-stop behavior.

## Context
`C` is already wired in `src/utils/keyboard-controller.ts`, but it is currently a one-way latch. `src/commands/do.ts` only checks `keyboard.isCancelled` after task finalization, while the rate-limit branch always retries after `waitForRateLimit(...)`. That means a cancel pressed during a wait is ignored until an extra retry runs. A naive break from the retry loop would also fall into the existing failure path and incorrectly write a FAILED outcome, so the execution flow needs an explicit graceful-stop branch.

## Implementation Steps
1. Update the keyboard controller state machine in `src/utils/keyboard-controller.ts`.
   Change the `c`/`C` branch from one-way assignment to toggle behavior, keep `Ctrl+C` mapped to `SIGINT`, and update the hotkey/help strings to describe toggle semantics.
2. Add an explicit graceful-stop path inside `executeSingleProject` in `src/commands/do.ts`.
   Represent “user chose not to continue before the next attempt/task” separately from `success` and `failure` so the current task can remain pending instead of being recorded as failed.
3. Wire the rate-limit boundary to that graceful-stop path.
   After `waitForRateLimit(...)` returns successfully, check `keyboard.isCancelled` before starting the retry. If cancel is still armed, stop the project run cleanly instead of decrementing `attempts` and retrying.
4. Keep the end-of-run summary consistent.
   Ensure the cancelled-session summary still reports incomplete work accurately and does not count the interrupted task as completed or failed.
5. Add regression tests.
   Extend `tests/unit/keyboard-controller.test.ts` for toggle-on/toggle-off behavior and updated strings. Add focused coverage for the `do.ts` rate-limit branch; if the current structure is too hard to test directly, extract a small helper around the post-wait decision and test that helper.
6. Update `README.md`.
   Add a short `raf do` note documenting `Tab`, `P`, and `C`, and clarify that `C` toggles a graceful stop at the next safe boundary, including before a rate-limit retry begins.

## Files to Modify
- `src/utils/keyboard-controller.ts`
- `src/commands/do.ts`
- `tests/unit/keyboard-controller.test.ts`
- `README.md`
- A focused do-command regression test file, likely alongside the existing `tests/unit/do-*.test.ts` suite

## Risks & Mitigations
- Soft cancel could accidentally fall through the existing failure branch and write a FAILED outcome.
  Mitigation: model graceful stop as its own control path, not as `success = false`.
- The rate-limit branch could still consume an extra retry if the cancel check happens after the retry bookkeeping.
  Mitigation: check `keyboard.isCancelled` immediately after the wait returns and before mutating `attempts` for the retry path.
- Hotkey-string updates can break brittle tests.
  Mitigation: update all direct string assertions together and keep wording stable.

## Notes
- `waitForRateLimit(...)` already receives pause and shutdown hooks. The key missing integration is in `do.ts`, not in the waiter itself.
- The intended semantics during a rate-limit wait are “stop before the retry starts unless the user clears cancel before the wait finishes.”
