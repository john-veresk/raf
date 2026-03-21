---
effort: low
---
# Task: Update Config Command Docs

## Objective
Refresh README and command/help text so the documented config workflow matches the new command hierarchy.

## Context
The current docs still describe `raf config` as an interactive editor, document `--reset`, and present presets as `raf preset`. The user only wants the docs updated to the new commands; no migration note or compatibility guidance is needed.

## Dependencies
1, 2

## Requirements
- Update `README.md` examples and command reference to use `raf config wizard`, `raf config get`, `raf config set`, `raf config reset`, and `raf config preset ...`.
- Remove README references to top-level `raf preset` and root-level config flags.
- Update Commander descriptions/help text so CLI help output matches the new hierarchy.
- Update internal user-facing config docs and strings that mention the old command surface, including prompt/reference content in `src/prompts/config-docs.md` where relevant.
- Do not add a breaking-change note, migration section, or compatibility note.

## Implementation Steps
1. Update `README.md` command overview, examples, and reference tables for the new config API.
2. Update `src/commands/config.ts` and `src/commands/preset.ts` descriptions so generated help text matches the new structure.
3. Sweep `src/prompts/config-docs.md` and nearby user-facing strings for stale references to bare `raf config`, `--reset`, and `raf preset`.
4. Verify the documented commands and examples match the actual Commander registration after Tasks 1 and 2.

## Acceptance Criteria
- [ ] `README.md` documents only the new config command forms.
- [ ] CLI help text reflects `wizard`, `get`, `set`, `reset`, and nested `preset`.
- [ ] No user-facing config docs still instruct users to run `raf preset` or `raf config --reset`.
- [ ] No migration note or compatibility section is added.
- [ ] All tests pass.

## Notes
Keep the doc sweep scoped to active user-facing docs and help text. Archived `RAF/*` history should not be rewritten.
