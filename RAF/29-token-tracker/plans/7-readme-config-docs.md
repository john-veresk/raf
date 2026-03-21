# Task: Document raf config in README and Strengthen README Update Policy

## Objective
Add `raf config` documentation to README.md and add explicit guidance in CLAUDE.md about keeping the README updated when CLI commands or important features change.

## Context
The `raf config` command is fully implemented but completely missing from the user-facing README. Users have no way to discover that configuration is possible, how to use it, or what can be configured. Additionally, CLAUDE.md's "Important Reminders" section should be more explicit about when README updates are required to prevent this gap from recurring.

## Requirements

### README updates
- Add a `raf config` section alongside the existing command documentation sections (`raf plan`, `raf do`, `raf status`)
- Keep it brief and consistent with the existing README style
- Include: command usage, what it does (interactive Claude session for config), basic config file example, 1-2 common use cases
- Add `raf config` to the Command Reference table at the bottom
- Mention the config file location (`~/.raf/raf.config.json`) and three-tier precedence (CLI flag > config > defaults)
- Do NOT duplicate the full config schema — reference that `raf config` itself provides interactive help

### CLAUDE.md updates
- Expand the "Important Reminders" section to explicitly state that README must be updated when:
  - New CLI commands are added
  - Existing command APIs change (new flags, changed behavior)
  - Important features are added (like worktrees, config, token tracking)
- Keep the reminder actionable and specific, not vague

## Implementation Steps
1. Read the current README.md to understand section ordering, style, and formatting conventions
2. Add a `### raf config` section after the existing `raf status` section, following the same format
3. Include a minimal config example showing 2-3 common settings (e.g., changing default model, setting worktree default)
4. Add `raf config` entries to the Command Reference tables
5. Update CLAUDE.md's "Important Reminders" with explicit README update policy

## Acceptance Criteria
- [ ] README has a `raf config` section with usage and basic example
- [ ] `raf config` appears in the Command Reference table
- [ ] Config file location and precedence rules are mentioned
- [ ] CLAUDE.md has explicit guidance about when to update README
- [ ] No existing README content is broken or removed
- [ ] Documentation tone and style match the rest of the README

## Notes
- The existing README documents `raf config` options: `--reset` flag and inline prompt (`raf config "use haiku"`) — these should be mentioned
- Look at `src/prompts/config-docs.md` for the full config reference — pick 2-3 of the most common/useful settings for the README example
- The README currently has a "Features" section that lists 7 features — consider adding "Configurable" to that list if not present
