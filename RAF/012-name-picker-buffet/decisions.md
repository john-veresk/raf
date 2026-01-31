# Project Decisions

## For the name picker feature: When generating project names, should the name-generating model also have access to the project description (input.md content) to make relevant suggestions?
Yes, use full context - Claude sees the project description to suggest relevant names.

## How should the name selection UI work?
Arrow key navigation - Interactive menu with arrow keys to select.

## For the `raf do` project picker: How should pending projects be displayed when no project name is given?
List all pending with arrow selection - Show all pending projects, user navigates with arrows.

## For `raf status` truncation: When showing only the last 10 projects, how should older projects be indicated?
"... and N more" at top - Shows count of hidden older projects.

## For failure reason details: Should the bullet points show ALL previous failure attempts, or just the most recent one?
All attempts - Show bullet point for each failed attempt with reason.

## For the name generation model: Which model should generate project name suggestions?
Claude Sonnet - More capable model for creative naming.

## For arrow key selection UI (both name picker and project picker): Which library should be used?
Use a library that supports navigation with arrow keys + custom input option. Options considered:
- `inquirer-list-input` plugin - allows list selection with arbitrary user input
- Standard `@inquirer/prompts` with chained prompts (list + conditional input for "Other")
Recommendation: Use `@inquirer/prompts` (modern inquirer) with "Other (enter custom name)" as a choice that triggers an input prompt.

## Should RAF commit at any point, or should Claude handle all commits?
Claude handles ALL commits. One task = one commit (code changes + outcome file together). RAF should NOT make any commits - neither after planning nor after project completion. The execution prompt needs to include file location instructions so Claude knows where to write the outcome file.

## Should Claude commit the outcome file in the same commit as code changes, or separately?
Same commit as code - one commit contains both the code changes and the outcome file.

## How should name generation handle projects with many unrelated tasks?
When the project description has many unrelated/disconnected tasks, prefer more abstract, metaphorical, or fun names instead of trying to be descriptive. A name like "spring-cleaning" or "grab-bag" is better than trying to describe all the unrelated tasks.

## [Amendment] For the plan mode fix: Should the user's project description from input.md be passed as the user message (with instructions in system prompt)?
Project description as user message - Pass the input.md content as user message, keep planning instructions in system prompt.

## [Amendment] For the dangerously-skip-permissions flag in plan mode: What should the CLI flag be named?
CLI flag --auto or -y - A shorter flag name that implies auto-approve, matching common CLI conventions.
