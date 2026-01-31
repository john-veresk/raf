# Project Decisions

## For the double Summary header fix: Should RAF strip the '## Summary' header from Claude's output in extractSummary(), OR should RAF stop adding its own '## Summary' header in the outcome template?
Remove from RAF template - Remove the '## Summary' header from RAF's outcome template in do.ts, letting Claude's header stand.

## For the README documentation: Which sections do you want to add for npm publishing readiness?
Essential only - Add: badges, better examples, GitHub repo link - minimal additions.

## For npm publishing instructions: Where should the publishing documentation live?
Don't add a publishing section to README. Instead, make sure README is up to date with the codebase, how to install, API usage, etc. The goal is that a person knows how to use the software.

## What is your npm username/org for the package name?
Keep as 'raf' - attempt to publish with the current name.

## For the 'publish to npm instructions' task: What format should this take?
Just produce a report on how to publish to npm, no code changes needed. This is documentation only.

## What is your GitHub repository URL for this project?
https://github.com/john-veresk/raf
