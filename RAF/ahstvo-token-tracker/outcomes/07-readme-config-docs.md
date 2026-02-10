# Outcome: Document raf config in README and Strengthen README Update Policy

## Summary

Added `raf config` documentation to README.md and expanded CLAUDE.md's "Important Reminders" with explicit guidance on when to update the README.

## Changes Made

### `README.md`
- Added "Configurable" bullet to the Features list
- Added `### raf config` section after `raf status` in the Commands section, including:
  - Command usage examples (interactive, with prompt, --reset)
  - Precedence rule (CLI flags > config file > defaults)
  - Minimal config file example with 3 common settings (models, worktree, timeout)
  - Note directing users to the interactive session for full config reference
- Added `### raf config [prompt]` to the Command Reference section with `--reset` option

### `CLAUDE.md`
- Expanded "Important Reminders" section with explicit README update policy:
  - When new CLI commands are added
  - When existing command flags or behavior change
  - When important features are added
  - When the Features list needs updating
- Separated README and CLAUDE.md update guidance into distinct items

## Verification

- All acceptance criteria met:
  - README has a `raf config` section with usage and basic example
  - `raf config` appears in the Command Reference table
  - Config file location (`~/.raf/raf.config.json`) and precedence rules are mentioned
  - CLAUDE.md has explicit guidance about when to update README
  - No existing README content was broken or removed
  - Documentation tone and style match the rest of the README

<promise>COMPLETE</promise>
