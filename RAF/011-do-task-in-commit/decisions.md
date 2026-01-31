# Project Decisions

## What should be the source of the task description for the commit message?
Instruct Claude in the task execution prompt to write a meaningful commit message describing what the task accomplished (not extract from plan file).

## How should long descriptions be handled in commit messages?
Let Claude decide based on the situation.

## Should the RAF prefix format still be kept in commit messages?
Yes, keep the RAF[project:task] prefix to identify RAF-managed commits. Format: `RAF[005:001] <description>`

## Should the prompt give Claude any guidelines for the commit message?
Minimal guidance - just tell Claude to write a meaningful commit message describing what was done. No strict rules like conventional commits.

## Should project name be included in commit message?
No. Only include a good, concise task name and short description. No project name.

## What is the scope of changes needed?
Three areas only:
1. Execution prompt (`src/prompts/execution.ts`)
2. Unit tests (`tests/unit/execution-prompt.test.ts`)
3. Documentation (`CLAUDE.md`)
