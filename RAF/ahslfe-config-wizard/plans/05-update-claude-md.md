# Task: Update CLAUDE.md with Config Architecture

## Objective
Update CLAUDE.md with the new config system architecture, the "configurable by default" principle, and all related documentation.

## Context
CLAUDE.md serves as the project's internal documentation and instruction set. It needs to reflect the new config system so that future Claude sessions (planning, execution) understand how config works. The user also wants an explicit architectural principle: if a feature can be configurable, it should be configurable via config.

## Dependencies
01, 02, 03, 04

## Requirements

### Add "Configurable by Default" principle:
- New architectural decision section stating: if a feature/setting can be configurable, it should be configurable through the config system
- Default config provides sensible defaults; global config in `~/.raf/raf.config.json` overrides them
- CLI flags override config values (three-tier precedence: CLI flag > global config > built-in defaults)

### Document the config system:
- Config file location: `~/.raf/raf.config.json`
- Schema overview: `models`, `effort`, `timeout`, `maxRetries`, `autoCommit`, `worktree`, `commitFormat`, `claudeCommand`
- Precedence chain: CLI flag > `~/.raf/raf.config.json` > DEFAULT_CONFIG
- Validation: strict, unknown keys rejected
- Reference to `src/types/config.ts` as single source of truth

### Document the `raf config` command:
- `raf config` — interactive Claude session for config editing
- `raf config <prompt>` — interactive session with initial prompt
- `raf config --reset` — restore defaults with confirmation
- Config docs bundled at `src/prompts/config-docs.md`

### Update existing sections:
- Update "Development Commands" if any new npm scripts were added
- Update file structure to include new files (`src/commands/config.ts`, `src/prompts/config-docs.md`)
- Update any references to the old config system (`raf.config.json` in project dirs → `~/.raf/raf.config.json`)
- Update the commit format section to reference config templates instead of hardcoded formats

## Implementation Steps
1. Read current CLAUDE.md to understand existing structure
2. Add "Configurable by Default" as a new architectural decision section
3. Add "Configuration System" section documenting schema, loading, validation, precedence
4. Add `raf config` to the commands documentation
5. Update directory structure to include new files
6. Update commit format documentation to reference templates
7. Update any stale references to the old project-local config
8. Keep the document concise — link to `src/prompts/config-docs.md` for full config reference rather than duplicating it

## Acceptance Criteria
- [ ] "Configurable by Default" principle documented as architectural decision
- [ ] Config system fully documented (location, schema overview, precedence, validation)
- [ ] `raf config` command documented
- [ ] Directory structure updated
- [ ] Old config references updated
- [ ] Commit format section references templates
- [ ] CLAUDE.md remains well-organized and concise

## Notes
- CLAUDE.md is the source of truth for Claude sessions working on this project — accuracy is critical
- Don't duplicate the full config reference (that's in `src/prompts/config-docs.md`) — just provide an overview and pointer
- The principle "configurable by default" should guide future development: when adding new features, add corresponding config keys
