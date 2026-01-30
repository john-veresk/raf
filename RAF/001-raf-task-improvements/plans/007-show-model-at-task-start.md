# Task: Show Model Name at Task Start

## Objective
Log the Claude model name once when task execution begins during the "do" phase.

## Context
Users may want to know which Claude model is being used for task execution. Currently, this information isn't displayed. Showing it at task start provides transparency about the execution environment.

## Requirements
- Log model name once at the start of each task
- Example: `Using model: claude-sonnet-4-20250514` or similar
- Get model from Claude CLI configuration or detect from environment
- Display at task start, not repeated during execution

## Implementation Steps
1. Determine how to get the current Claude model:
   - Check if Claude CLI has a way to report current model
   - Could use `claude --version` or config file
   - May need to parse from Claude's output or use API
2. In `src/commands/do.ts`, at task start:
   - Get current model name
   - Log it once: `logger.info('Using model: {modelName}')`
3. If model detection isn't reliable, consider:
   - Adding a config option for model name
   - Detecting from Claude's first response

## Acceptance Criteria
- [ ] Model name logged at start of each task
- [ ] Format: `Using model: {model-name}`
- [ ] Logged only once per task, not repeated
- [ ] Graceful handling if model can't be detected
- [ ] All tests pass

## Notes
- Claude CLI may have different ways to get model info
- Consider caching the model name if detection is expensive
- May need to research Claude CLI's configuration/output format
- If model detection is unreliable, could show "Using Claude CLI" as fallback
- Check if there's an environment variable or config file with model info
