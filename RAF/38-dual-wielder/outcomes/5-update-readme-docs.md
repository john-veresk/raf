# Task 5: Update README and Documentation

## Summary
Updated README.md to reflect dual-provider support for Claude Code CLI and OpenAI Codex CLI.

## Changes Made

### `README.md`
- Updated title: "RAF - Automated Task Planning & Execution with Claude Code" → "RAF - Automated Task Planning & Execution"
- Updated description to mention both Claude Code CLI and OpenAI Codex CLI
- Updated Requirements section to list both providers
- Updated Features list to add "Multi-Provider" bullet
- Updated generic language ("the model needs" instead of "Claude needs")
- Updated Quick Start comment from "Claude will interview you" to be generic
- Added `"provider": "claude"` to the config example
- Added **Provider Configuration** section with:
  - `--provider codex` CLI usage examples
  - Model spec format (plain aliases and `<provider>/<alias>` prefix)
  - Codex-specific config example (`codexModels`, `codexEffortMapping`)
  - Codex limitations (`--resume` not supported, system prompt prepend behavior)
- Updated Command Reference tables for `raf plan` and `raf do`:
  - Added `-p, --provider <name>` row
  - Added `-m, --model <name>` row to `raf plan`
  - Updated model description to show harness-prefixed examples
- Updated the dangerous-mode note to be provider-generic

## Acceptance Criteria
- [x] README reflects multi-provider support
- [x] New config fields are documented (`provider`, `codexModels`, `codexEffortMapping`)
- [x] `--provider` flag is documented for `raf do` and `raf plan`
- [x] Existing documentation is updated (not just appended)

<promise>COMPLETE</promise>
