# Task: Create Config Documentation

## Objective
Create a comprehensive config documentation file bundled in the package that serves as both user-facing docs and the system prompt for the `raf config` Claude session.

## Context
The `raf config` command will spawn an interactive Claude session that needs full knowledge of the config schema, valid values, defaults, and how to edit the file. This documentation serves double duty: it's readable by users and injected as a system prompt for Claude during config sessions.

## Dependencies
01

## Requirements
- File location: `src/prompts/config-docs.md` (bundled in package, versioned with code)
- Must be comprehensive enough for Claude to edit config without any other context
- Must be readable by humans as standalone documentation
- Must cover every config key, its type, valid values, default, and what it controls

### Content structure:
1. **Overview** — what the config is, where it lives (`~/.raf/raf.config.json`), how it works
2. **File format** — JSON, all keys optional, deep-merge with defaults
3. **Config reference** — every key documented:
   - Key path (e.g., `models.plan`)
   - Type and valid values
   - Default value
   - What it controls and when it's used
   - Example
4. **Commit format templates** — explain the `{placeholder}` syntax, available variables per template type
5. **Validation rules** — what gets rejected (unknown keys, invalid values)
6. **Examples** — complete example configs for common scenarios (minimal, full, team-specific)
7. **CLI precedence** — explain that CLI flags override config values
8. **Reset instructions** — how to reset to defaults

### Claude-specific instructions (for when used as system prompt):
- How to read the current config file
- How to validate changes before saving
- How to explain changes to the user
- Never remove keys the user didn't ask to change

## Implementation Steps
1. Write the documentation file at `src/prompts/config-docs.md` covering all sections above
2. Reference the actual config schema types from task 01 to ensure completeness — every key in the schema must be documented
3. Include practical examples showing partial configs (users only set what they want to change)
4. Add a "For Claude" section at the end with instructions for the config editing session (read file, validate, explain, write)
5. Ensure the file can be imported/read at runtime by the config command (task 04 will handle the actual import)

## Acceptance Criteria
- [ ] Every config key from the schema is documented with type, default, valid values, and description
- [ ] Commit format template variables are fully documented
- [ ] At least 3 example configs included (minimal, common, full)
- [ ] Claude session instructions are clear and complete
- [ ] File is readable standalone as user documentation
- [ ] File is at `src/prompts/config-docs.md`

## Notes
- This file will be read by Claude at runtime during `raf config` sessions — keep it clear and unambiguous
- The documentation must stay in sync with the schema — if schema changes, docs must update too
- Keep the tone practical and direct — this is a reference document, not a tutorial
