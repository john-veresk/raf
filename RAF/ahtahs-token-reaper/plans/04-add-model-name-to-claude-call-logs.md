# Task: Add model name to all Claude invocation log messages

## Objective
Display the short model alias (e.g., "sonnet", "haiku") in all log messages where RAF invokes Claude for non-task purposes.

## Context
When RAF calls Claude for auxiliary tasks (name generation, failure analysis, PR generation, config), it logs a message but doesn't indicate which model is being used. Users want visibility into which model is handling each call, especially since models are configurable per scenario.

## Requirements
- Use the format "...with <model>..." — append the model name before the trailing ellipsis
- Display the short alias (sonnet, haiku, opus) not the full model ID
- Apply to all four Claude invocation log messages:
  1. Name generation: `src/commands/plan.ts` line 158 — currently "Generating project name suggestions..."
  2. Failure analysis: `src/commands/do.ts` line 1111 — currently "Analyzing failure..."
  3. PR generation: `src/core/pull-request.ts` — currently no explicit log message (add one)
  4. Config session: `src/commands/config.ts` line 184 — currently "Starting config session with Claude..."
- Create a utility to extract the short alias from a full model ID string (e.g., "claude-sonnet-4-5-20250929" → "sonnet")
- The model value comes from `getModel()` calls in each module — the short name should be derived from whatever that returns

## Implementation Steps
1. Add a `getModelShortName(modelId: string)` utility that extracts the short alias from a model ID string — handle both full IDs ("claude-sonnet-4-5-20250929") and already-short names ("sonnet")
2. Update the name generation log in `src/commands/plan.ts` to include the model: "Generating project name suggestions with sonnet..."
3. Update the failure analysis log in `src/commands/do.ts` to include the model: "Analyzing failure with haiku..."
4. Add a log message for PR generation in `src/core/pull-request.ts`: "Generating PR with haiku..."
5. Update the config session log in `src/commands/config.ts` to include the model: "Starting config session with sonnet..."
6. Cover the `getModelShortName()` utility with unit tests

## Acceptance Criteria
- [ ] All four Claude invocation points show the model short name in their log messages
- [ ] Short name extraction works for full model IDs and already-short names
- [ ] Log format follows the "...with <model>..." pattern
- [ ] Unit tests cover the short name utility
- [ ] All tests pass

## Notes
- The model for each scenario is retrieved via `getModel('nameGeneration')`, `getModel('failureAnalysis')`, `getModel('prGeneration')`, `getModel('config')` from `src/utils/config.ts`
- Some call sites may need to retrieve the model earlier or pass it around to have it available at the log point — for instance, name generation logs in `plan.ts` but the model is determined inside `name-generator.ts`
- For the config session, there's already a line showing the model — consolidate if appropriate
