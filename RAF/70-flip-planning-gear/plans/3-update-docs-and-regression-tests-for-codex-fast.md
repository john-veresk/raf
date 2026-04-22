---
effort: low
---
# Task: Update Docs And Regression Tests For Codex Fast

## Objective
Document the revived Codex fast-mode behavior and lock it in with regression coverage.

## Requirements
- Update user-facing docs to describe `fast` as a Codex-only `ModelEntry` field that defaults to omitted.
- Document the interactive Codex shape (`codex -c 'service_tier="fast"' "prompt"`) and RAF’s corresponding behavior.
- Update test coverage for config validation, runner args, name-generation args, and `raf do` display formatting.
- Reconcile stale test expectations that already refer to `fast` but no longer match the current codebase.

## Acceptance Criteria
- [ ] [`README.md`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/README.md) explains how to configure Codex fast mode per model entry and clarifies that Claude entries reject it.
- [ ] [`src/prompts/config-docs.md`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/prompts/config-docs.md) shows the updated `ModelEntry` shape and at least one Codex fast example.
- [ ] Unit tests cover Codex interactive and exec argument injection, name-generation arg building, and `(model, effort, fast)` output.
- [ ] The stale compact-output expectation in `tests/unit/command-output.test.ts` is either made real by the implementation or rewritten to match the final formatter behavior.

## Dependencies
1
2

## Files to Modify
- [`README.md`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/README.md)
- [`src/prompts/config-docs.md`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/prompts/config-docs.md)
- [`tests/unit/codex-runner.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/codex-runner.test.ts)
- [`tests/unit/name-generator.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/name-generator.test.ts)
- [`tests/unit/do-model-display.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/do-model-display.test.ts)
- [`tests/unit/terminal-symbols.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/terminal-symbols.test.ts)
- [`tests/unit/command-output.test.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/tests/unit/command-output.test.ts)

## Risks & Mitigations
- Doc drift: the repo currently documents no fast-mode support, so update both README and config-docs in the same task to avoid contradictory guidance.
- Regression blind spot: there is already one stale `fast` expectation in the test suite; search for remaining `fast` references after implementation so the final suite reflects one coherent contract.

## Notes
- Keep examples aligned with the user’s chosen console format for `raf do`: `(gpt-5.4, medium, fast)`.
