# Project Decisions

## What exactly should be removed - the SUMMARY.md file generation, the console summary output, or both?
Remove SUMMARY.md file only - Keep console output, stop generating SUMMARY.md in outcomes/

## For 'support passing full name to the project' - what change do you want?
Leave optional user-provided name working as is. If name not provided, use Haiku with modified prompt (see task 4 about improving Haiku prompt to use most important task).

## For the numbering prefix problem (what happens after 999?), which approach?
Alphanumeric base36 (a00-zzz) - Uses 0-9 and a-z, gives ~46,000 combinations in 3 chars.

## Should we migrate existing projects to new format?
Start fresh, no migration - New projects use base36, old projects stay as-is but mixed formats allowed.

## When should base36 kick in?
After 999 - Keep familiar 001-999, then a00, a01... for project numbers 1000+.

## How should Haiku identify the 'most important task' from project description?
Let Haiku decide - Tell Haiku to analyze and pick the most impactful/core task.

## Any specific guidelines for how Haiku should name projects?
Add 'focus on core feature' - Tell Haiku to name based on the main functionality being built.
