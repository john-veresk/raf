---
effort: low
---
# Task: Update README and Documentation

## Objective
Update README.md to reflect multi-provider support, new config options, and the `--provider` CLI flag.

## Context
The README currently describes RAF as a Claude Code-only tool. With Codex support added, documentation needs to reflect the dual-provider capability.

## Dependencies
1, 2, 3, 4

## Requirements
- Document the `provider` config field and `--provider` CLI flag
- Document harness-prefixed model format (`claude/opus`, `codex/gpt-5.4`)
- Document Codex-specific configuration (codexModels, codexEffortMapping)
- Update existing examples that reference Claude-only setup
- Keep README concise — don't over-document

## Implementation Steps

1. **Update the project description** at the top of README.md:
   - Mention support for both Claude Code CLI and OpenAI Codex CLI

2. **Add a Provider Configuration section**:
   - Explain `provider` config field (default: `claude`)
   - Show `--provider codex` CLI usage
   - Explain model prefix format with examples

3. **Update the Configuration section**:
   - Add `codexModels` and `codexEffortMapping` to config example
   - Show harness-prefixed model examples

4. **Update command examples**:
   - Add `--provider` flag to `raf do` and `raf plan` examples
   - Show mixed provider usage

5. **Note limitations**:
   - Codex doesn't support `--resume` (session resume)
   - System prompt is prepended to user message for Codex

## Acceptance Criteria
- [ ] README reflects multi-provider support
- [ ] New config fields are documented
- [ ] `--provider` flag is documented for relevant commands
- [ ] Existing documentation is updated (not just appended)

## Notes
- Keep the README focused on usage, not implementation details
- Don't document internal architecture changes (runner interface, etc.)
