Implemented the `raf do` model display update so existing compact task lines and verbose model logs now append resolved reasoning effort and `fast` metadata when present.

Key changes:
- Updated [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/utils/terminal-symbols.ts) to centralize model metadata formatting and allow compact task progress lines to render `(model, effort, fast)` while omitting unavailable metadata.
- Updated [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/src/commands/do.ts) to thread resolved `reasoningEffort` and `fast` through running/completed/failed compact lines and through verbose `Model:` and retry logs.
- Added coverage in [`tests/unit/terminal-symbols.test.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/tests/unit/terminal-symbols.test.ts), [`tests/unit/command-output.test.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/tests/unit/command-output.test.ts), and new [`tests/unit/do-model-display.test.ts`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/tests/unit/do-model-display.test.ts).
- Updated [`README.md`](/Users/eremeev/.raf/worktrees/RAF/45-signal-lantern/README.md) to note the enriched non-verbose `raf do` task-line display.

Important notes:
- Verification commands could not run in this worktree because `node_modules` is absent, so local `jest` and `tsc` binaries were unavailable.
- Attempted verification:
  - `npm test -- --runInBand tests/unit/terminal-symbols.test.ts tests/unit/command-output.test.ts tests/unit/do-model-display.test.ts` -> failed with `jest: command not found`
  - `npm run lint` -> failed with `tsc: command not found`

<promise>COMPLETE</promise>
