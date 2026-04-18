---
effort: medium
---
# Task: Make Planning Always Dangerous

## Objective
Make `raf plan` run in dangerous mode by default, while keeping legacy `-y/--auto` invocations silently accepted as no-ops.

## Requirements
- `raf plan` and `raf plan --amend` must always launch interactive planning with permission bypass enabled, without requiring `-y/--auto`.
- Reuse the existing `RunnerOptions.dangerouslySkipPermissions` contract instead of adding a new config key or a second planning-only knob.
- Planning must behave consistently for both supported planning harnesses:
  `models.plan.harness: "claude"` must still pass `--dangerously-skip-permissions`.
  `models.plan.harness: "codex"` must stop ignoring the dangerous-mode request and pass Codex’s interactive dangerous flag.
- Keep parsing `-y/--auto` so older commands do not fail, but remove all user-visible and code-path semantics tied to the flag:
  no help text
  no warnings
  no branching on `autoMode`
  no auto-specific name or amend behavior
- Preserve every non-permission interactive step that already exists, especially the duplicate-project amend/create prompt and the name picker flow.
- Update README and tests so the documented/public contract is “planning is always dangerous,” not “use `-y` to make it dangerous.”

## Acceptance Criteria
- [ ] Plain `raf plan` passes dangerous interactive mode to Claude planning sessions.
- [ ] Plain `raf plan` passes dangerous interactive mode to Codex planning sessions.
- [ ] `raf plan -y` and `raf plan --auto` still parse successfully but behave identically to plain `raf plan`.
- [ ] `raf plan --help` and [README.md](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/README.md) no longer advertise `-y/--auto`.
- [ ] Duplicate-project detection still prompts the user to amend/create/cancel even when the legacy flag is present.
- [ ] Unit tests cover the new default behavior and the silent legacy compatibility path.

## Context
The current codebase already defines `-y/--auto` in [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/commands/plan.ts), but that flag only toggles `dangerouslySkipPermissions` for interactive Claude planning. It does not represent “default yes,” and it does not affect interactive Codex planning at all because [src/core/codex-runner.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/core/codex-runner.ts) ignores that option. The new contract is simpler: planning is always dangerous, and the old flag is tolerated only for backward compatibility.

## Implementation Steps
1. Simplify the planning command surface in [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/commands/plan.ts).
   Remove `autoMode` from the real control flow.
   Keep a hidden/deprecated `-y/--auto` option registered only so Commander continues to accept old invocations.
   Always call `runInteractive(..., { dangerouslySkipPermissions: true, cwd })` from both new-plan and amend flows.
2. Make interactive Codex planning honor the existing dangerous-mode option in [src/core/codex-runner.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/core/codex-runner.ts).
   Preserve non-interactive `codexExecutionMode` behavior for `raf do`.
   Only the interactive path should map `dangerouslySkipPermissions: true` to `--dangerously-bypass-approvals-and-sandbox`.
3. Update shared runner comments/types where needed, most likely in [src/core/runner-types.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/core/runner-types.ts), so the option description matches its cross-harness interactive use.
4. Reconcile tests with the new contract.
   Replace the current `plan-command-auto-flag` assertions with compatibility-focused coverage: the legacy option still parses, but it is hidden/no-op and plain `raf plan` already uses dangerous mode.
   Add Codex interactive coverage in [tests/unit/codex-runner.test.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/tests/unit/codex-runner.test.ts) for the dangerous interactive flag path.
   Keep or tighten Claude interactive tests only where they still validate real behavior.
5. Update docs in [README.md](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/README.md).
   Remove the public `-y/--auto` plan flag from command reference/help text.
   Replace the note that says `raf plan -y` behavior is unchanged with language that planning is already dangerous by default.

## Files to Modify
- [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/commands/plan.ts)
- [src/core/codex-runner.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/core/codex-runner.ts)
- [src/core/runner-types.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/src/core/runner-types.ts)
- [README.md](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/README.md)
- [tests/unit/plan-command-auto-flag.test.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/tests/unit/plan-command-auto-flag.test.ts)
- [tests/unit/codex-runner.test.ts](/Users/eremeev/.raf/worktrees/RAF/67-samurai-switch/tests/unit/codex-runner.test.ts)

## Risks & Mitigations
- Interactive Codex uses a different dangerous flag from non-interactive `codex exec`.
  Mitigation: limit the Codex change to `runInteractive()` and leave `codexExecutionMode` untouched.
- Backward-compat parsing can accidentally preserve old semantics if any `autoMode` branches remain.
  Mitigation: remove `autoMode` parameters/logging entirely and rely on a single unconditional dangerous-mode call site in planning.
- The existing-project prompt intentionally interrupts automated flows to avoid silent duplication.
  Mitigation: keep that prompt untouched and cover the legacy-flag path with a focused command-level test.

## Notes
The target behavior is equivalent to this shape in the planning path:

```ts
await runner.runInteractive(systemPrompt, userMessage, {
  dangerouslySkipPermissions: true,
  cwd,
});
```

For Codex interactive planning, the corresponding CLI arg should be `--dangerously-bypass-approvals-and-sandbox`, not `--full-auto`.
