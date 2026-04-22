---
effort: medium
---
# Task: Wire Codex Fast Runtime And Do Display

## Objective
Carry Codex `fast` settings through every Codex invocation path and show that mode in `raf do` task logs.

## Requirements
- Extend runner config plumbing so resolved model entries can pass `fast` into Codex runtime code.
- In [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/codex-runner.ts), append `-c 'service_tier="fast"'` when `fast` is true for both interactive `codex` sessions and non-interactive `codex exec` runs.
- Preserve the existing interactive command shape: interactive Codex should still launch as `codex ... [PROMPT]`, not `codex exec`.
- Update all current Codex runner creation call sites that consume `ModelEntry` so `fast` is not dropped on the floor.
- Update the direct Codex path in [`src/utils/name-generator.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/name-generator.ts) because `models.nameGeneration` bypasses `createRunner()`.
- Append `fast` to the existing `raf do` model metadata display when enabled, producing compact output like `● 3-task-name (gpt-5.4, medium, fast) 19m 41s`.
- Keep `fast` hidden when falsy and leave Claude runtime behavior unchanged.

## Acceptance Criteria
- [ ] Codex interactive planning/config sessions include `-c 'service_tier="fast"'` only when the selected model entry has `fast: true`.
- [ ] Codex non-interactive execution and name-generation flows include the same override only when configured.
- [ ] `raf do` compact task lines append `fast` after the existing model/effort metadata when enabled.
- [ ] Verbose `raf do` model logs stay consistent with the compact formatter.
- [ ] No Claude CLI invocation gains new flags from this work.

## Dependencies
1

## Context
The interactive half of the user request is already partly satisfied: `CodexRunner.runInteractive()` currently launches `codex -m <model> <prompt>` without `exec`. The missing behavior is the `service_tier` override and the propagation of `fast` through every Codex entry point, including the standalone name-generation path.

## Implementation Steps
1. Add `fast?: boolean` to [`src/core/runner-types.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/runner-types.ts) and thread it through runner construction sites in `plan`, `do`, `config`, and worktree merge flows.
2. Update [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/codex-runner.ts) to store the flag and inject `-c 'service_tier="fast"'` into both interactive and exec argument builders alongside the existing reasoning-effort override.
3. Update [`src/utils/name-generator.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/name-generator.ts) so Codex-based name generation honors `models.nameGeneration.fast`.
4. Extend [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/terminal-symbols.ts) and [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/commands/do.ts) so the existing model metadata slot can render `(model, effort, fast)` without changing non-fast output.

## Files to Modify
- [`src/core/runner-types.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/runner-types.ts)
- [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/codex-runner.ts)
- [`src/utils/name-generator.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/name-generator.ts)
- [`src/commands/plan.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/commands/plan.ts)
- [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/commands/do.ts)
- [`src/commands/config.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/commands/config.ts)
- [`src/core/worktree.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/worktree.ts)
- [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/terminal-symbols.ts)

## Risks & Mitigations
- Hidden consumer risk: `nameGeneration` does not use `createRunner()`. Cover it explicitly so `models.nameGeneration.fast` is not a dead setting.
- CLI compatibility risk: assert the presence of the `-c service_tier="fast"` pair rather than brittle full-array ordering in tests.
- Display ambiguity risk: preserve the current meaning of RAF’s existing `effort` display slot and only append `fast`; do not fold in unrelated effort-model refactors here.

## Notes
- The local CLI inspection on this machine (`codex-cli 0.122.0`) shows `-c/--config` is available on both `codex` and `codex exec`, which supports the chosen “all Codex runs” scope.
