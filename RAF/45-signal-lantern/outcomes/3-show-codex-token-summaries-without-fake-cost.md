Updated RAF's shared token-summary formatting so token counts still render for all providers, but USD cost only appears when the CLI supplies an exact value. This removes misleading `$0.00` output from Codex summaries while preserving exact Claude cost reporting.

Key changes:
- Updated `src/utils/terminal-symbols.ts` to make cost rendering availability-aware for both per-task summaries and grand-total summaries, while still treating exact zero as a real cost.
- Updated `tests/unit/terminal-symbols.test.ts` to cover Codex-style token-only summaries, mixed multi-attempt cost availability, and Claude exact-cost regressions.
- Updated `tests/unit/command-output.test.ts` to verify the logged output path shows token-only Codex summaries and exact Claude totals.
- Updated `README.md` to document that Codex currently reports exact token counts post-run, but RAF omits USD cost unless the provider returns an exact price.

Important notes:
- `src/commands/do.ts` already routed both per-task and grand-total usage output through the shared formatter, so no provider-specific command branching was needed.
- Verification was attempted but blocked by the worktree environment because `node_modules` is absent:
  - `npm test -- --runInBand tests/unit/terminal-symbols.test.ts tests/unit/command-output.test.ts` -> failed with `jest: command not found`
  - `npm run lint` -> failed with `tsc: command not found`
<promise>COMPLETE</promise>
