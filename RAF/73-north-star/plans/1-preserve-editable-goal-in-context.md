---
effort: medium
---
# Task: Preserve Editable Goal In Context

## Objective
Keep `input.md` as RAF-managed raw prompt history while turning `context.md`'s `## Goal` into a maintained clarified summary that planning and amend flows can update without losing it on refresh.

## Requirements
- Keep `input.md` in the project structure and continue using it as the raw request/history artifact.
- Preserve the `## Goal` section name in `context.md`; do not rename it to `User Prompt`.
- Stop treating `## Goal` as a direct projection of the first meaningful block from `input.md`.
- Make `refreshProjectContext()` preserve an existing edited `## Goal` when rebuilding the rest of `context.md`.
- Bootstrap `## Goal` from `input.md` only when a project has no existing goal text yet.
- Update both planning and amend flows so the planner can revise `context.md`'s `## Goal` after interview clarifications and when amendments materially change direction.
- Keep existing downstream consumers that read `## Goal` from `context.md` working without requiring a new section name.
- Update README and regression tests to match the new contract: `input.md` stores raw input, `context.md` stores the maintained goal summary.

## Key Decisions
- `input.md` remains the canonical raw prompt/history file managed by RAF.
- `context.md` keeps the `## Goal` section name.
- `## Goal` is now a clarified summary of the project direction, not a blind copy of raw input.
- The authoritative stored goal lives in editable `context.md`, and RAF must preserve it across context refreshes.
- `raf plan --amend` should resummarize `## Goal` when the user changes direction or materially reframes scope.

## Acceptance Criteria
- [ ] New projects still start with a reasonable `## Goal` seeded from the initial `input.md` content.
- [ ] If planning or amend updates `context.md`'s `## Goal`, later `refreshProjectContext()` calls keep that goal text intact.
- [ ] Legacy projects that only have raw `input.md` still regenerate a usable fallback goal until someone explicitly rewrites it.
- [ ] `raf plan --amend` can change the stored goal summary, and the updated summary survives the post-session context refresh.
- [ ] README and tests describe and verify the preserved-goal behavior and the continued presence of `input.md`.

## Context
Today `src/core/project-context.ts` derives `## Goal` from the first meaningful block in `input.md`, while `runAmendCommand()` appends new request text to `input.md`. That means the generated goal never reliably reflects clarified interview outcomes or later change-of-direction amendments. On top of that, `refreshProjectContext()` rewrites the full file, so any direct goal edit would be lost immediately unless refresh becomes merge-aware.

## Implementation Steps
1. In [src/core/project-context.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/core/project-context.ts), separate goal bootstrapping from context regeneration:
   Use the existing `context.md` `## Goal` section when present, and only fall back to a summary from `input.md` when no stored goal exists yet.
2. Refactor the context builder so only `## Goal` is preserved from the existing file while the generated sections (`## Key Decisions`, `## Current State`, `## Completed Work`, `## Pending Work`, `## Source Files`) stay deterministic.
3. In [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/commands/plan.ts), verify the plan and amend flows still seed `context.md` before interactive planning starts and do not clobber a goal that the planner edits during the session.
4. In [src/prompts/planning.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/prompts/planning.ts) and [src/prompts/amend.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/prompts/amend.ts), instruct the planner to update `context.md`'s `## Goal` to a clarified summary once interview decisions settle, and to revise it again during amend when scope direction changes.
5. Update [README.md](/Users/eremeev/.raf/worktrees/RAF/73-north-star/README.md) so project structure and `context.md` semantics no longer imply that the goal is just copied from raw input or that the whole file is purely machine-generated.
6. Add regression coverage for preserved-goal refresh behavior, goal bootstrap fallback, and prompt wording that tells planners to maintain the goal summary.

## Files to Modify
- [src/core/project-context.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/core/project-context.ts)
- [src/commands/plan.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/commands/plan.ts)
- [src/prompts/planning.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/prompts/planning.ts)
- [src/prompts/amend.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/src/prompts/amend.ts)
- [README.md](/Users/eremeev/.raf/worktrees/RAF/73-north-star/README.md)
- [tests/unit/project-context.test.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/tests/unit/project-context.test.ts)
- [tests/unit/planning-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/tests/unit/planning-prompt.test.ts)
- [tests/unit/amend-prompt.test.ts](/Users/eremeev/.raf/worktrees/RAF/73-north-star/tests/unit/amend-prompt.test.ts)

## Risks & Mitigations
- Preserving editable content inside a generated file can expand scope if RAF starts trying to keep arbitrary manual edits.
  Preserve only `## Goal`; continue regenerating every other section from source artifacts.
- The planner may forget to update the goal summary even after the code preserves it.
  Make the prompt contract explicit and cover the wording with prompt-level tests.
- Older projects may keep stale generated goal text until a future planning/amend session revises it.
  Keep input-based fallback for missing goals and let the next human-guided planning pass rewrite the summary intentionally.

## Notes
- No config change is needed for this feature.
- Keep the `## Goal` heading stable so existing PR-generation and context consumers do not need a parallel migration.
