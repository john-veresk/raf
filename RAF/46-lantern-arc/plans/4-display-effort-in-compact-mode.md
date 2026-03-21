---
effort: medium
---
# Task: Display effort level in compact mode task status

## Objective
Show the frontmatter effort level (low/medium/high) in the compact task status line during `raf do`.

## Context
The compact display during `raf do` shows model and fast flag in parentheses but not the effort level from the plan frontmatter. The `formatModelMetadata` function in `terminal-symbols.ts` already supports an `effort` option, and `do.ts` already passes `effort: currentModelReasoningEffort` — but `currentModelReasoningEffort` comes from `modelResolution.entry.reasoningEffort` (the model's reasoning effort parameter), NOT the frontmatter's effort field (low/medium/high). These are different concepts: frontmatter effort selects the model tier, while reasoningEffort is a runtime model parameter.

## Requirements
- Pass the frontmatter effort (low/medium/high) to the compact display
- Show it inside parentheses: `(sonnet, medium, fast)`
- Don't confuse it with `reasoningEffort` (model parameter)

## Implementation Steps
1. In `src/commands/do.ts`, add a variable to track the frontmatter effort level:
   - Add `let currentEffort: string | undefined;` alongside the existing `currentModelReasoningEffort` tracking
   - After `resolveTaskModel`, set `currentEffort = task.frontmatter?.effort;`
2. Update the three display call sites (running ~line 827, completed ~line 1034, failed ~line 1069) to pass `effort: currentEffort` instead of `effort: currentModelReasoningEffort`
3. Decide what to do with `currentModelReasoningEffort` — if it's not displayed anywhere else, it can be removed. If it serves another purpose, keep both.

## Acceptance Criteria
- [ ] Running task status shows effort: `● 01-task-name (sonnet, medium) 12s`
- [ ] Effort displays correctly for low, medium, and high values
- [ ] Tasks without effort frontmatter don't show a blank entry
- [ ] TypeScript compiles without errors
