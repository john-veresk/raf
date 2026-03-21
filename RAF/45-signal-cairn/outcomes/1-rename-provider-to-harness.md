# Outcome

## Summary

Renamed RAF's per-model config schema from `provider` to `harness` across runtime code, prompts, documentation, and tests without adding compatibility shims. The validator now accepts only `harness`, runner creation and logging use `entry.harness`, and the docs/examples describe the new schema consistently.

## Key Changes

- Updated config types and defaults to use `harness` in [src/types/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/types/config.ts) and propagated that rename through config parsing, validation, merge logic, and model-spec parsing in [src/utils/config.ts](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/utils/config.ts).
- Renamed downstream runtime consumers in planning, execution, config, preset listing, runner creation, name generation, and validation so they use harness-based properties and wording.
- Rewrote user-facing docs and prompt material in [README.md](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/README.md), [src/prompts/config-docs.md](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/src/prompts/config-docs.md), and [CLAUDE.md](/Users/eremeev/.raf/worktrees/RAF/45-signal-cairn/CLAUDE.md).
- Refreshed config, name-generation, execution-prompt, dependency, commit-planning, and runner tests to assert on `harness`, and isolated several suites from the machine's real `~/.raf` config so the renamed schema tests are stable.

## Notes

- Verification required bootstrapping the worktree with `npm install` because `node_modules` was absent.
- Full verification completed with `npm run lint` and `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false`.

<promise>COMPLETE</promise>
