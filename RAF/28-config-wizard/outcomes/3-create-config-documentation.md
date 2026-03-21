# Outcome: Create Config Documentation

## Summary

Created comprehensive config documentation at `src/prompts/config-docs.md` that serves as both user-facing reference and system prompt for the `raf config` Claude session.

## Key Changes

### `src/prompts/config-docs.md` (new file)
- **Overview** section explaining config location (`~/.raf/raf.config.json`), caching, and optional-key semantics
- **File format** section explaining JSON format and deep-merge behavior with examples
- **Config reference** documenting every key:
  - `models.*` (6 scenarios) — type, valid values (`sonnet`/`haiku`/`opus`), defaults, descriptions
  - `effort.*` (6 scenarios) — type, valid values (`low`/`medium`/`high`), defaults, descriptions
  - `timeout` — positive number, default 60
  - `maxRetries` — non-negative integer, default 3
  - `autoCommit` — boolean, default true
  - `worktree` — boolean, default false
  - `commitFormat.*` (4 keys) — template strings with `{placeholder}` syntax
  - `claudeCommand` — non-empty string, default "claude"
- **Commit format template variables** documented per template type (task, plan, amend) with all available placeholders
- **Validation rules** section listing all rejection conditions (unknown keys, invalid values, type checks)
- **CLI precedence** section explaining flag > config > default order
- **4 example configs**: minimal (single override), common (cost-conscious), full (all defaults explicit), team branding (custom prefix)
- **Reset instructions** for full reset (delete file) and single-key reset (remove key)
- **Claude session instructions** covering: reading config, making changes (partial writes, validation, preserving keys), explaining changes, showing current config, common user requests

## Acceptance Criteria

- [x] Every config key from the schema is documented with type, default, valid values, and description
- [x] Commit format template variables are fully documented
- [x] At least 3 example configs included (minimal, common, full, + team branding)
- [x] Claude session instructions are clear and complete
- [x] File is readable standalone as user documentation
- [x] File is at `src/prompts/config-docs.md`

<promise>COMPLETE</promise>
