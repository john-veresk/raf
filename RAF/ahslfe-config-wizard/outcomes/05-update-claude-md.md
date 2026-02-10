# Outcome: Update CLAUDE.md with Config Architecture

## Summary

Updated CLAUDE.md to document the new config system, the "configurable by default" principle, and the `raf config` command.

## Key Changes

### `CLAUDE.md`
- **Directory structure**: Updated commands comment to include `config`, added `config-docs.md` under `prompts/`
- **Configurable by Default** (new architectural decision): Documents the principle that all settings should be configurable, with three-tier precedence (CLI flag > global config > built-in defaults)
- **Configuration System** (new section): Documents config file location, schema overview, validation, deep-merge, helper accessors, and pointer to full reference
- **`raf config` Command** (new section): Documents all three usage modes (`raf config`, `raf config <prompt>`, `raf config --reset`)
- **Git Commit Schema**: Updated to reference configurable `commitFormat.*` templates with `{placeholder}` syntax instead of hardcoded format, added `renderCommitMessage()` reference

## Acceptance Criteria

- [x] "Configurable by Default" principle documented as architectural decision
- [x] Config system fully documented (location, schema overview, precedence, validation)
- [x] `raf config` command documented
- [x] Directory structure updated
- [x] Old config references updated (commit format now references templates)
- [x] Commit format section references templates
- [x] CLAUDE.md remains well-organized and concise

<promise>COMPLETE</promise>
