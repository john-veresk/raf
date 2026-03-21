# Project Decisions

## Should RAF check the outcome file first, only the outcome file, or check both sources (terminal output AND outcome file) for robustness?
Both sources (Recommended) - Check terminal output first, fall back to outcome file - more robust.

## Should we add a unit test specifically for the outcome file fallback behavior, or are integration tests sufficient?
Integration only - Rely on existing integration tests, just ensure the fix works.

## Where in do.ts should the fallback check happen?
Let Claude decide the implementation placement.

## Should this be split into multiple tasks or kept as a single task?
Single task (Recommended) - One task: fix marker detection with outcome file fallback.

## What style of creative project names do you prefer?
Mix of styles - Let Claude be creative with any memorable style.

## Should the project name still hint at what the project does, or can it be completely abstract?
Metaphorical - Use metaphors/analogies that capture the spirit of the task.
