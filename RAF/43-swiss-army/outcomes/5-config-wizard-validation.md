# Outcome: Add Model Name & Reasoning Effort Validation to Config Wizard

## Summary

Added comprehensive model name lists, reasoning effort guidance, and wizard validation instructions to `src/prompts/config-docs.md`. The config wizard agent now has all the information it needs to validate model names against known lists and guide users on reasoning effort configuration.

## Changes Made

- **`src/prompts/config-docs.md`**:
  - Added "Valid Model Names" section with tables of Claude aliases (opus, sonnet, haiku) and Codex aliases (spark, codex, gpt54), their resolved model IDs, and notes on full model ID patterns
  - Added "Prefixed Format" subsection documenting `provider/model` syntax
  - Added "Reasoning Effort" section with valid values per provider, model support notes, and practical guidance on when to adjust effort levels
  - Added "Validating Model Names" subsection in the Config Editing Session Instructions, instructing the wizard agent to check names against the known list, suggest web search for unknown names, catch common typos, and validate reasoning effort values per provider

## Acceptance Criteria Status

- [x] config-docs.md contains a list of known valid model names for Claude and Codex — tables with aliases and full IDs for both providers
- [x] config-docs.md contains general reasoning effort guidance — valid values per provider, support notes, and usage guidance
- [x] Config wizard prompt instructs the agent to validate model names — "Validating Model Names" section with 3-step validation flow
- [x] Config wizard prompt instructs web search for unknown model names — step 2 suggests WebSearch tool when available
- [x] Documentation is clear and concise — organized with tables, grouped by provider, practical guidance included

<promise>COMPLETE</promise>
