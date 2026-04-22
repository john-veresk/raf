Implemented Codex `fast` runtime wiring across RAF’s runner paths and updated `raf do` model metadata display to surface `fast` when enabled.

Key changes:
- Threaded `fast?: boolean` through runner config and all current `createRunner()` call sites in `plan`, `config`, `do`, and merge/worktree flows.
- Updated [`src/core/codex-runner.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/core/codex-runner.ts) so both interactive `codex ...` sessions and non-interactive `codex exec ...` runs append `-c service_tier="fast"` only when `fast` is enabled.
- Updated [`src/utils/name-generator.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/name-generator.ts) so direct Codex name generation also honors `models.nameGeneration.fast`.
- Extended [`src/utils/terminal-symbols.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/utils/terminal-symbols.ts) and [`src/commands/do.ts`](/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear/src/commands/do.ts) so compact and verbose task model metadata render `fast` after model/effort, while hiding it when falsy.
- Added and updated unit coverage for Codex runner args, name generation, terminal formatting, and verbose model display; refreshed README notes for the new Codex `fast` behavior.

Verification:
- `npm test -- tests/unit/codex-runner.test.ts tests/unit/name-generator.test.ts tests/unit/terminal-symbols.test.ts tests/unit/do-model-display.test.ts tests/unit/command-output.test.ts`
- `npm run lint`

Notes:
- Claude runner behavior remains unchanged; no new Claude CLI flags were introduced.
- The task payload’s nested project path was stale, so implementation and verification were run from the actual repo root at `/Users/eremeev/.raf/worktrees/RAF/70-flip-planning-gear`.

<promise>COMPLETE</promise>
