---
effort: medium
---
# Task: Add Model Name & Reasoning Effort Validation to Config Wizard

## Objective
Update config-docs.md and the config wizard prompt to include a hardcoded list of valid model names and general reasoning effort guidance, with instructions to search the web for latest information.

## Context
The config wizard (used by `raf config`) needs to help users pick valid model names and understand reasoning effort options. Currently, config-docs.md doesn't provide enough guidance on which exact model names are valid or which models support reasoning effort.

## Dependencies
1

## Requirements
- Add a hardcoded list of known-good model names/aliases to config-docs.md for both Claude and Codex
- Include general guidance about reasoning effort: what it does, which providers support it, valid values
- Add instructions in the config wizard prompt to search the web for latest model names if the user wants to use a model not in the list
- Don't document model-specific reasoning effort details — keep it general with links to provider docs
- Validate exact model names in the config wizard conversation (the wizard agent should check names against the list)

## Implementation Steps
1. Read `src/prompts/config-docs.md` — understand current structure
2. Add a "Valid Model Names" section with known aliases and full IDs for Claude (sonnet, haiku, opus, claude-sonnet-4-5-20250929, etc.) and Codex (spark, codex, gpt54, gpt-5.4, etc.)
3. Add a "Reasoning Effort" section with general guidance: available for supporting models, valid values (none, minimal, low, medium, high, xhigh, max), link to Anthropic/OpenAI docs
4. Read `src/commands/config.ts` — update the config wizard system prompt to instruct the agent to:
   - Validate model names against the known list
   - If user enters an unknown model name, suggest searching the web for validity
   - Provide reasoning effort guidance when configuring model entries
5. Ensure the wizard prompt tells the agent to use WebSearch tool if available to verify unfamiliar model names

## Acceptance Criteria
- [ ] config-docs.md contains a list of known valid model names for Claude and Codex
- [ ] config-docs.md contains general reasoning effort guidance
- [ ] Config wizard prompt instructs the agent to validate model names
- [ ] Config wizard prompt instructs web search for unknown model names
- [ ] Documentation is clear and concise

## Notes
- The config wizard runs as an interactive Claude session with config-docs.md as context
- The wizard agent may or may not have WebSearch available — the prompt should suggest it as best-effort
- Keep the model list maintainable — group by provider, note that aliases resolve to specific versions
