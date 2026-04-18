Implemented the model display cleanup so RAF no longer invents pinned full model IDs for aliases in user-facing output. `raf do` now keeps configured aliases like `opus`, `sonnet`, `codex`, and `gpt54` in the ceiling banner and verbose task-model logs, while explicit full model IDs continue to display unchanged.

Key changes made:
- Updated `src/utils/config.ts` to remove alias-to-full-ID display expansion from the shared display helper and preserve explicit full IDs as-is.
- Updated `src/commands/do.ts` so the ceiling banner and verbose task-model formatting use the configured identifier instead of guessed full IDs.
- Updated `src/prompts/config-docs.md` and `README.md` to describe aliases as provider-default/unpinned selectors and clarify that exact versions only display when explicitly configured.
- Updated `tests/unit/config.test.ts` and `tests/unit/do-model-display.test.ts` to cover Claude and Codex alias behavior, explicit full-ID preservation, and the revised shared display semantics.
- Removed stale `display` config tests from `tests/unit/config.test.ts`; they targeted a schema key that does not exist in the current config implementation.

Important notes:
- Verification passed with `npm test -- tests/unit/config.test.ts tests/unit/do-model-display.test.ts` and `npm run lint`.
- `npm install` was required locally to run verification because the worktree did not have dependencies installed. That left an unstaged `package-lock.json` change, which was intentionally not included in this task's commit.

<promise>COMPLETE</promise>
