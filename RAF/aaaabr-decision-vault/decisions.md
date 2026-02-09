# Project Decisions

## What commit message format should be used for planning artifacts?
RAF[NNN] Plan: project-name - Follow existing RAF commit convention with 'Plan:' prefix

## Should this commit happen automatically or be opt-in via a flag?
Always commit automatically after every successful planning session

## What should happen if the git commit fails (e.g., not in a git repo)?
Warn and continue - Show a warning message but don't fail the planning session

## Which files should be committed after planning?
Only input.md and decisions.md - Just the input and decisions, not the generated plans
