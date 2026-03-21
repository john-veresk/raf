---
effort: medium
---
# Task: Move Preset Commands Under Config

## Objective
Nest preset management under the `config` namespace as `raf config preset ...` while keeping preset behavior unchanged.

## Context
RAF currently exposes presets as a top-level `raf preset` command implemented in `src/commands/preset.ts` and registered in `src/index.ts`. The desired API moves this functionality under `raf config preset`, and the old top-level command should be removed entirely.

## Dependencies
1

## Requirements
- Keep preset behavior identical to the current implementation for `save`, `load`, `list`, and `delete`.
- Expose presets at `raf config preset save <name>`, `load <name>`, `list`, and `delete <name>`.
- Remove the top-level `raf preset` command and its registration from the CLI.
- Do not add a compatibility shim, alias, or deprecation path for `raf preset`.
- Update preset-related help text and runtime messages so they reference `raf config preset ...` instead of `raf preset ...`.
- Keep preset storage format and location unchanged at `~/.raf/presets/*.json`.

## Implementation Steps
1. Refactor `src/commands/preset.ts` so it can be registered as a nested `preset` subcommand under `config`.
2. Wire the nested preset command into `src/commands/config.ts`.
3. Remove the top-level preset command registration from `src/index.ts`.
4. Update preset command descriptions and error/help strings that still point users to `raf preset ...`.
5. Verify the nested command structure remains intuitive in Commander help output.

## Acceptance Criteria
- [ ] `raf config preset save <name>` saves the current config exactly as the old preset command did.
- [ ] `raf config preset load <name>`, `list`, and `delete <name>` behave the same as before.
- [ ] `raf preset` is no longer registered as a top-level command.
- [ ] User-facing preset messages reference `raf config preset ...`.
- [ ] All tests pass.

## Notes
This task should stay focused on command topology and message updates. Preset file semantics should not change.
