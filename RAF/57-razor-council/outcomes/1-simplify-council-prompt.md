# Outcome: Simplify Council Mode Prompt

## Summary

Replaced the verbose council mode sections in `planning.ts` and `amend.ts` with a short, tool-agnostic 4-bullet paragraph.

## Changes Made

- `src/prompts/planning.ts`: Replaced ~47-line `councilSection` with 5-line version
- `src/prompts/amend.ts`: Replaced ~57-line `councilSection` with identical 5-line version

Both sections now read:

```
## Council Mode

You are operating in **council mode** as a team leader.

- Spawn sub-agents to investigate tasks in parallel
- Collect their draft plans and questions
- Consolidate and deduplicate questions, then interview the user
- Review, merge, and write all final plan files yourself
```

Removed: specific tool references (Agent, AskUserQuestion, SendMessage), sub-agent prompt templates, and step-by-step instructions.

## Build

`npm run build` passes with no errors.

<promise>COMPLETE</promise>
